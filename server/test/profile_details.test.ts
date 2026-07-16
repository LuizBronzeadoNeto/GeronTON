import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

let caregiverToken: string;
let professionalToken: string;
let perfilId: number;

const CLEAN_CHECKIN = {
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
  stressLevel: 0,
  sunExposure: true,
  selfExpression: true,
  stimulation: true,
  dailyBath: true,
  oralHygiene: true,
  groomedNails: true,
};

/**
 * Detail-view endpoint integration tests. A dedicated profile keeps the shared
 * dev database's other data out of the assertions; deleting it in afterAll
 * cascades over its check-ins and alerts.
 */
beforeAll(async () => {
  const caregiverRes = await request(app)
    .post("/login")
    .send({ email: "cuidador@demo.com", password: "senha123" });
  expect(caregiverRes.status).toBe(200);
  caregiverToken = caregiverRes.body.token;

  const professionalRes = await request(app)
    .post("/login")
    .send({ email: "profissional@demo.com", password: "senha123" });
  expect(professionalRes.status).toBe(200);
  professionalToken = professionalRes.body.token;

  const profileRes = await request(app)
    .post("/perfis")
    .set("Authorization", `Bearer ${caregiverToken}`)
    .send({
      firstName: "Detalhe",
      lastName: "Teste",
      birthDate: "1939-08-22",
      scholarship: "fundamental",
    });
  expect(profileRes.status).toBe(201);
  perfilId = profileRes.body.id;
});

afterEach(async () => {
  await prisma.alert.deleteMany({ where: { profileId: perfilId } });
  await prisma.checkIn.deleteMany({ where: { profileId: perfilId } });
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: perfilId } });
});

async function createCheckIn(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post(`/perfis/${perfilId}/avaliacoes`)
    .set("Authorization", `Bearer ${caregiverToken}`)
    .send({ ...CLEAN_CHECKIN, ...overrides });
  expect(res.status).toBe(201);
  return res.body;
}

async function getDetails(token = caregiverToken) {
  return request(app)
    .get(`/perfis/${perfilId}/detalhes`)
    .set("Authorization", `Bearer ${token}`);
}

describe("GET /perfis/:id/detalhes", () => {
  it("returns the profile with null check-in and no alerts when empty", async () => {
    const res = await getDetails();

    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({
      id: perfilId,
      firstName: "Detalhe",
      lastName: "Teste",
    });
    expect(res.body.latestCheckIn).toBeNull();
    expect(res.body.alerts).toEqual([]);
  });

  it("returns only the most recent check-in", async () => {
    const older = await createCheckIn();
    await prisma.checkIn.update({
      where: { id: older.id },
      data: { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
    const newer = await createCheckIn({ mood: "sad" });

    const res = await getDetails();

    expect(res.status).toBe(200);
    expect(res.body.latestCheckIn.id).toBe(newer.id);
    expect(res.body.latestCheckIn.mood).toBe("sad");
  });

  it("includes only the open alerts", async () => {
    await createCheckIn({ calfCircumference: "29" });

    const first = await getDetails();
    expect(first.status).toBe(200);
    expect(first.body.alerts).toHaveLength(1);
    expect(first.body.alerts[0].type).toBe("sarcopenia_risk");

    const resolveRes = await request(app)
      .put(`/perfis/${perfilId}/alertas/${first.body.alerts[0].id}`)
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ resolved: true });
    expect(resolveRes.status).toBe(200);

    const second = await getDetails();
    expect(second.body.alerts).toEqual([]);
  });

  it("is accessible to professionals", async () => {
    const res = await getDetails(professionalToken);

    expect(res.status).toBe(200);
    expect(res.body.profile.id).toBe(perfilId);
  });

  it("rejects requests without a valid token", async () => {
    const res = await request(app).get(`/perfis/${perfilId}/detalhes`);

    expect(res.status).toBe(401);
  });

  it("returns 404 for a nonexistent perfilId", async () => {
    const res = await request(app)
      .get("/perfis/999999999/detalhes")
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(res.status).toBe(404);
  });
});
