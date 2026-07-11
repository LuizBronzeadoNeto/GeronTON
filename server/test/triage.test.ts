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
let stableId: number;
let moderateId: number;
let highId: number;
let unknownId: number;

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
 * Triage dashboard integration tests. Four dedicated profiles cover one risk
 * level each, so the ordering can be asserted on their relative positions
 * regardless of whatever else lives in the shared dev database; deleting them
 * in afterAll cascades over their children.
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

  [stableId, moderateId, highId, unknownId] = await Promise.all(
    ["Estavel", "Moderado", "Grave", "SemDados"].map(async (firstName) => {
      const res = await request(app)
        .post("/perfis")
        .set("Authorization", `Bearer ${caregiverToken}`)
        .send({
          firstName,
          lastName: "Triagem",
          birthDate: "1942-03-15",
          scholarship: "fundamental",
        });
      expect(res.status).toBe(201);
      return res.body.id as number;
    }),
  );
});

afterEach(async () => {
  const ids = [stableId, moderateId, highId, unknownId];
  await prisma.checkIn.deleteMany({ where: { profileId: { in: ids } } });
  await prisma.intercorrence.deleteMany({ where: { profileId: { in: ids } } });
});

afterAll(async () => {
  await prisma.profile.deleteMany({
    where: { id: { in: [stableId, moderateId, highId, unknownId] } },
  });
});

async function createCheckIn(
  profileId: number,
  overrides: Record<string, unknown> = {},
) {
  const res = await request(app)
    .post(`/perfis/${profileId}/avaliacoes`)
    .set("Authorization", `Bearer ${caregiverToken}`)
    .send({ ...CLEAN_CHECKIN, ...overrides });
  expect(res.status).toBe(201);
  return res.body;
}

async function getTriage() {
  return request(app)
    .get("/triagem")
    .set("Authorization", `Bearer ${professionalToken}`);
}

/**
 * Restricts the triage response to the suite's own profiles, keeping their
 * response order, so assertions ignore profiles created by other suites.
 */
function mine(body: { id: number }[]): { id: number }[] {
  const ids = new Set([stableId, moderateId, highId, unknownId]);
  return body.filter((entry) => ids.has(entry.id));
}

describe("GET /triagem", () => {
  it("orders the profiles by clinical priority", async () => {
    await createCheckIn(stableId);
    await createCheckIn(moderateId, {
      chokingIncident: true,
      appetite: "regular",
    });
    await createCheckIn(highId, {
      unstableGait: true,
      chokingIncident: true,
      medsOnTime: false,
    });

    const res = await getTriage();

    expect(res.status).toBe(200);
    expect(mine(res.body).map((entry) => entry.id)).toEqual([
      highId,
      moderateId,
      stableId,
      unknownId,
    ]);
  });

  it("carries each profile's risk and critical weekly events", async () => {
    await createCheckIn(highId, { weeklyEvents: ["fever", "pain", "cough"] });

    const res = await getTriage();

    expect(res.status).toBe(200);
    const entry = res.body.find((item: { id: number }) => item.id === highId);
    expect(entry.firstName).toBe("Grave");
    expect(entry.risk).toEqual({
      status: "moderate",
      score: 9,
      criticalEvents: ["fever"],
    });
  });

  it("orders by functional score within the same level", async () => {
    await createCheckIn(highId, {
      unstableGait: true,
      chokingIncident: true,
      medsOnTime: false,
      appetite: "bad",
    });
    await createCheckIn(moderateId, {
      unstableGait: true,
      chokingIncident: true,
      medsOnTime: false,
    });

    const res = await getTriage();

    const ordered = mine(res.body).map((entry) => entry.id);
    expect(ordered.indexOf(highId)).toBeLessThan(ordered.indexOf(moderateId));
  });

  it("forbids caregivers", async () => {
    const res = await request(app)
      .get("/triagem")
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(res.status).toBe(403);
  });

  it("rejects requests without a valid token", async () => {
    const res = await request(app).get("/triagem");

    expect(res.status).toBe(401);
  });
});
