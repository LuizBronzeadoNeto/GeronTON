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

let token: string;
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
 * Risk status integration tests. A dedicated profile is created so the scores
 * are not affected by check-ins or intercorrences other suites leave behind on
 * the shared dev database; deleting it in afterAll cascades over its children.
 */
beforeAll(async () => {
  const loginRes = await request(app)
    .post("/login")
    .send({ email: "cuidador@demo.com", password: "senha123" });

  expect(loginRes.status).toBe(200);
  token = loginRes.body.token;

  const profileRes = await request(app)
    .post("/perfis")
    .set("Authorization", `Bearer ${token}`)
    .send({
      firstName: "Risco",
      lastName: "Teste",
      birthDate: "1940-05-01",
      scholarship: "fundamental",
    });

  expect(profileRes.status).toBe(201);
  perfilId = profileRes.body.id;
});

afterEach(async () => {
  await prisma.checkIn.deleteMany({ where: { profileId: perfilId } });
  await prisma.intercorrence.deleteMany({ where: { profileId: perfilId } });
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: perfilId } });
});

async function createCheckIn(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post(`/perfis/${perfilId}/avaliacoes`)
    .set("Authorization", `Bearer ${token}`)
    .send({ ...CLEAN_CHECKIN, ...overrides });
  expect(res.status).toBe(201);
  return res.body;
}

async function createIntercorrence(
  isCritical: boolean,
  eventType = "fall",
): Promise<{ id: number }> {
  const res = await request(app)
    .post(`/perfis/${perfilId}/intercorrencias`)
    .set("Authorization", `Bearer ${token}`)
    .send({ eventType, isCritical, description: "risk test" });
  expect(res.status).toBe(201);
  return res.body;
}

async function getRisk() {
  return request(app)
    .get(`/perfis/${perfilId}/risco`)
    .set("Authorization", `Bearer ${token}`);
}

describe("GET /perfis/:perfilId/risco", () => {
  it("returns unknown when there are no check-ins or intercorrences", async () => {
    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.profileId).toBe(perfilId);
    expect(res.body.status).toBe("unknown");
    expect(res.body.score).toBe(0);
    expect(res.body.criticalEvents).toEqual([]);
    expect(typeof res.body.evaluatedAt).toBe("string");
  });

  it("returns low for a clean latest check-in", async () => {
    await createCheckIn();

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("low");
    expect(res.body.score).toBe(0);
  });

  it("stays low up to a functional score of 5", async () => {
    await createCheckIn({ chokingIncident: true });

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("low");
    expect(res.body.score).toBe(5);
  });

  it("returns moderate from a functional score of 6", async () => {
    await createCheckIn({ chokingIncident: true, appetite: "regular" });

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("moderate");
    expect(res.body.score).toBe(6);
  });

  it("weighs the health-domain warning signs", async () => {
    await createCheckIn({
      skinIssues: true,
      bowelRegular: false,
      sleepWell: false,
      unstableGait: true,
    });

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("moderate");
    expect(res.body.score).toBe(11);
  });

  it("returns high from a functional score of 12", async () => {
    await createCheckIn({
      unstableGait: true,
      chokingIncident: true,
      medsOnTime: false,
    });

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("high");
    expect(res.body.score).toBe(12);
  });

  it("adds 5 points per critical weekly event and flags them", async () => {
    await createCheckIn({
      weeklyEvents: ["fever", "active_bleeding", "pain"],
    });

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("high");
    expect(res.body.score).toBe(12);
    expect(res.body.criticalEvents).toEqual(["fever", "active_bleeding"]);
  });

  it("scores the behavioral and stimulation domain", async () => {
    await createCheckIn({
      mood: "very_sad",
      sunExposure: false,
      selfExpression: false,
      stimulation: false,
    });

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("low");
    expect(res.body.score).toBe(5);
  });

  it("scores low saturation and small calf circumference from the vital signs", async () => {
    await createCheckIn({ saturation: "90%", calfCircumference: "30,5" });

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("moderate");
    expect(res.body.score).toBe(6);
  });

  it("does not score blood pressure or glycemia outliers (flags only)", async () => {
    await createCheckIn({ pressure: "150/95", glycemia: "250" });

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("low");
    expect(res.body.score).toBe(0);
  });

  it("forces at least moderate when a non-critical intercorrence exists", async () => {
    await createCheckIn();
    await createIntercorrence(false);

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("moderate");
    expect(res.body.score).toBe(0);
  });

  it("forces high when a critical intercorrence exists", async () => {
    await createIntercorrence(true);

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("high");
    expect(res.body.score).toBe(0);
  });

  it("forces high for intrinsically critical event types regardless of severity", async () => {
    await createIntercorrence(false, "fever");

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("high");
    expect(res.body.score).toBe(0);
  });

  it("preserves the more severe status when the weekly score is already high", async () => {
    await createCheckIn({
      unstableGait: true,
      chokingIncident: true,
      medsOnTime: false,
    });
    await createIntercorrence(false);

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("high");
    expect(res.body.score).toBe(12);
  });

  it("only scores the most recent check-in", async () => {
    const older = await createCheckIn({
      weeklyEvents: ["active_bleeding", "acute_confusion"],
      chokingIncident: true,
      medsOnTime: false,
    });
    await prisma.checkIn.update({
      where: { id: older.id },
      data: { date: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    await createCheckIn();

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("low");
    expect(res.body.score).toBe(0);
  });

  it("ignores intercorrences older than 30 days", async () => {
    const old = await createIntercorrence(true);
    await prisma.intercorrence.update({
      where: { id: old.id },
      data: { date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) },
    });

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("unknown");
    expect(res.body.score).toBe(0);
  });

  it("rejects requests without a valid token", async () => {
    const res = await request(app).get(`/perfis/${perfilId}/risco`);

    expect(res.status).toBe(401);
  });

  it("returns 404 for a nonexistent perfilId", async () => {
    const res = await request(app)
      .get(`/perfis/999999999/risco`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
