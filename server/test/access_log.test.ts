import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { localDay, recordAccess } from "../src/services/accessLog.js";
import { usageByMonth } from "../src/services/metrics.js";

const CAREGIVER = "uso.cuidador@test.com";
const PROFESSIONAL = "uso.profissional@test.com";
const PASSWORD = "senha12345";

let caregiverId: number;
let professionalId: number;
let professionalToken: string;

/**
 * Rows dated in 2019 and 2020 belong to this suite only. The metrics suite
 * uses 2018, so the two can run side by side.
 */
const OLD_DAYS = {
  gte: new Date("2019-01-01T00:00:00.000Z"),
  lt: new Date("2021-01-01T00:00:00.000Z"),
};

beforeAll(async () => {
  await request(app)
    .post("/cuidadores")
    .send({ email: CAREGIVER, password: PASSWORD, acceptedTerms: true });
  await request(app)
    .post("/profissionais")
    .send({ email: PROFESSIONAL, password: PASSWORD, crm: "77003-PB" });
  professionalToken = (
    await request(app)
      .post("/login")
      .send({ email: PROFESSIONAL, password: PASSWORD })
  ).body.token;
  caregiverId = (
    await prisma.user.findUniqueOrThrow({ where: { email: CAREGIVER } })
  ).id;
  professionalId = (
    await prisma.user.findUniqueOrThrow({ where: { email: PROFESSIONAL } })
  ).id;
});

afterAll(async () => {
  await prisma.accessLog.deleteMany({ where: { day: OLD_DAYS } });
  await prisma.user.deleteMany({
    where: { email: { in: [CAREGIVER, PROFESSIONAL] } },
  });
  await prisma.$disconnect();
});

describe("localDay", () => {
  it("uses São Paulo time, not UTC", () => {
    expect(localDay(new Date("2026-10-10T02:00:00.000Z"))).toBe("2026-10-09");
    expect(localDay(new Date("2026-10-10T15:00:00.000Z"))).toBe("2026-10-10");
  });
});

describe("recordAccess", () => {
  it("logs one row per account per day", async () => {
    const day = new Date("2020-03-10T15:00:00.000Z");

    await recordAccess({ id: caregiverId, role: "cuidador" }, day);
    await recordAccess({ id: caregiverId, role: "cuidador" }, day);
    await recordAccess(
      { id: caregiverId, role: "cuidador" },
      new Date("2020-03-11T15:00:00.000Z"),
    );

    const rows = await prisma.accessLog.findMany({
      where: { userId: caregiverId, day: OLD_DAYS },
      orderBy: { day: "asc" },
    });
    expect(rows.map((row) => row.day.toISOString().slice(0, 10))).toEqual([
      "2020-03-10",
      "2020-03-11",
    ]);
    expect(rows[0].role).toBe("cuidador");
  });

  it("is triggered by authenticated requests", async () => {
    await request(app)
      .get("/perfis")
      .set("Authorization", `Bearer ${professionalToken}`);

    // The middleware doesn't wait for the insert, so give it a moment.
    let count = 0;
    for (let attempt = 0; attempt < 20 && count === 0; attempt += 1) {
      count = await prisma.accessLog.count({
        where: { userId: professionalId, day: { gte: OLD_DAYS.lt } },
      });
      if (count === 0) await new Promise((done) => setTimeout(done, 50));
    }
    expect(count).toBe(1);
  });
});

describe("usageByMonth", () => {
  beforeAll(async () => {
    await prisma.accessLog.createMany({
      data: [
        {
          userId: caregiverId,
          role: "cuidador",
          day: new Date("2020-01-05T00:00:00.000Z"),
        },
        {
          userId: caregiverId,
          role: "cuidador",
          day: new Date("2020-01-06T00:00:00.000Z"),
        },
        {
          userId: professionalId,
          role: "profissional",
          day: new Date("2020-01-06T00:00:00.000Z"),
        },
        // An account deleted since: still a day of use, but nobody to count.
        {
          userId: null,
          role: "cuidador",
          day: new Date("2019-12-20T00:00:00.000Z"),
        },
      ],
    });
  });

  it("totals each month, oldest first, with empty months as zeros", async () => {
    const usage = await usageByMonth(3, new Date("2020-02-10T15:00:00.000Z"));

    expect(usage).toEqual([
      {
        mes: "2019-12",
        acessos: 1,
        usuarios: 0,
        cuidadores: 0,
        profissionais: 0,
      },
      {
        mes: "2020-01",
        acessos: 3,
        usuarios: 2,
        cuidadores: 1,
        profissionais: 1,
      },
      {
        mes: "2020-02",
        acessos: 0,
        usuarios: 0,
        cuidadores: 0,
        profissionais: 0,
      },
    ]);
  });
});
