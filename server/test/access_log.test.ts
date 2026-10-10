import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { localDay, recordAccess } from "../src/services/accessLog.js";
import { buildUsageReport } from "../src/routes/reports.js";

const CAREGIVER = "uso.cuidador@test.com";
const PROFESSIONAL = "uso.profissional@test.com";
const PASSWORD = "senha12345";

let caregiverId: number;
let professionalId: number;
let caregiverToken: string;
let professionalToken: string;

/** Rows dated before 2021 belong to this suite only; nothing else writes there. */
const OLD_DAYS = { lt: new Date("2021-01-01T00:00:00.000Z") };

beforeAll(async () => {
  await request(app)
    .post("/cuidadores")
    .send({ email: CAREGIVER, password: PASSWORD, acceptedTerms: true });
  await request(app)
    .post("/profissionais")
    .send({ email: PROFESSIONAL, password: PASSWORD, crm: "77003-PB" });
  caregiverToken = (
    await request(app)
      .post("/login")
      .send({ email: CAREGIVER, password: PASSWORD })
  ).body.token;
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

describe("buildUsageReport", () => {
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
    const usage = await buildUsageReport(
      3,
      new Date("2020-02-10T15:00:00.000Z"),
    );

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

describe("GET /relatorios/acessos", () => {
  it("returns the last 6 months by default", async () => {
    const res = await request(app)
      .get("/relatorios/acessos")
      .set("Authorization", `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.meses).toHaveLength(6);
    expect(res.body.meses[5].mes).toBe(localDay(new Date()).slice(0, 7));
  });

  it("downloads a CSV", async () => {
    const res = await request(app)
      .get("/relatorios/acessos?meses=2&formato=csv")
      .set("Authorization", `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    const lines = res.text
      .replace(/^\uFEFF/, "")
      .trim()
      .split("\r\n");
    expect(lines[0]).toBe("mes;acessos;usuarios;cuidadores;profissionais");
    expect(lines).toHaveLength(3);
  });

  it("rejects an invalid number of months", async () => {
    const res = await request(app)
      .get("/relatorios/acessos?meses=0")
      .set("Authorization", `Bearer ${professionalToken}`);

    expect(res.status).toBe(400);
  });

  it("is off limits to caregivers", async () => {
    const res = await request(app)
      .get("/relatorios/acessos")
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(res.status).toBe(403);
  });
});
