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
  falls: 0,
  weightLoss: 0,
  choking: false,
  gaitImpairment: false,
  violenceSign: false,
  irregularSleep: false,
  socialIsolation: false,
  failedComms: false,
  memoryLoss: false,
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

async function createIntercorrence(isCritical: boolean) {
  const res = await request(app)
    .post(`/perfis/${perfilId}/intercorrencias`)
    .set("Authorization", `Bearer ${token}`)
    .send({ eventType: "fall", isCritical, description: "risk test" });
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
    expect(typeof res.body.evaluatedAt).toBe("string");
  });

  it("returns low for a clean latest check-in", async () => {
    await createCheckIn();

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("low");
    expect(res.body.score).toBe(0);
  });

  it("returns moderate when warning signs accumulate", async () => {
    await createCheckIn({ falls: 1, irregularSleep: true, memoryLoss: true });

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("moderate");
    expect(res.body.score).toBe(3);
  });

  it("returns high for severe check-in flags", async () => {
    await createCheckIn({
      falls: 2,
      weightLoss: 4,
      choking: true,
      violenceSign: true,
    });

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("high");
    expect(res.body.score).toBe(8);
  });

  it("counts recent intercorrences, weighting critical ones", async () => {
    await createIntercorrence(true);
    await createIntercorrence(false);

    const res = await getRisk();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("moderate");
    expect(res.body.score).toBe(4);
  });

  it("only scores the most recent check-in", async () => {
    const older = await createCheckIn({
      falls: 5,
      choking: true,
      violenceSign: true,
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
