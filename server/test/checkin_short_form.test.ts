import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { makeCpf } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

let caregiverToken: string;
let perfilId: number;

const SHORT_CHECKIN = {
  shortForm: true,
  skinIssues: false,
  bowelRegular: true,
  sleepWell: true,
  unstableGait: false,
  weeklyEvents: [] as string[],
  appetite: "good",
  chokingIncident: false,
  breathShortness: false,
  hydrationGoal: true,
  medsOnTime: true,
  mood: "happy",
  stressLevel: 1,
  sunExposure: true,
  selfExpression: true,
  stimulation: true,
};

/**
 * Short check-in (SCRUM-15): skips the hygiene and logistics steps.
 */
beforeAll(async () => {
  caregiverToken = (
    await request(app)
      .post("/login")
      .send({ email: "cuidador@demo.com", password: "senha123" })
  ).body.token;

  const profileRes = await request(app)
    .post("/perfis")
    .set("Authorization", `Bearer ${caregiverToken}`)
    .send({
      cpf: makeCpf("120000003"),
      firstName: "Curto",
      lastName: "Checkin",
      birthDate: "1945-01-15",
      scholarship: "fundamental",
    });
  expect(profileRes.status).toBe(201);
  perfilId = profileRes.body.id;
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: perfilId ?? -1 } });
  await prisma.$disconnect();
});

function post(body: Record<string, unknown>) {
  return request(app)
    .post(`/perfis/${perfilId}/avaliacoes`)
    .set("Authorization", `Bearer ${caregiverToken}`)
    .send(body);
}

describe("short check-in", () => {
  it("accepts a check-in without the hygiene answers", async () => {
    const res = await post(SHORT_CHECKIN);

    expect(res.status).toBe(201);
    expect(res.body.shortForm).toBe(true);
    expect(res.body.dailyBath).toBeNull();
    expect(res.body.oralHygiene).toBeNull();
    expect(res.body.groomedNails).toBeNull();
    expect(res.body.needsMedications).toEqual([]);
  });

  it("drops hygiene and logistics answers sent with a short check-in", async () => {
    const res = await post({
      ...SHORT_CHECKIN,
      dailyBath: true,
      needsFood: ["Leite"],
    });

    expect(res.status).toBe(201);
    expect(res.body.dailyBath).toBeNull();
    expect(res.body.needsFood).toEqual([]);
  });

  it("still requires the hygiene answers on the full check-in", async () => {
    const res = await post({ ...SHORT_CHECKIN, shortForm: false });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("dailyBath");
  });

  it("scores a short check-in the same as the full one", async () => {
    await post({ ...SHORT_CHECKIN, unstableGait: true, appetite: "bad" });

    const risk = await request(app)
      .get(`/perfis/${perfilId}/risco`)
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(risk.status).toBe(200);
    expect(risk.body.score).toBe(7);
  });

  it("rejects a non-boolean shortForm", async () => {
    const res = await post({ ...SHORT_CHECKIN, shortForm: "sim" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("shortForm");
  });
});
