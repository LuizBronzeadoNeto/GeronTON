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
import { grantProfileAccess, makeCpf } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

let token: string;
let perfilId: number;
const createdIds: number[] = [];

const PROFILE_MARKER = "TestIntercorrencia";

/**
 * Creates its own profile rather than reusing whichever one happens to be in
 * the shared dev database: depending on ambient data made this suite fail
 * outright once the table was empty, and left it asserting against a record
 * another suite could delete mid-run.
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
      cpf: makeCpf("100000020"),
      firstName: PROFILE_MARKER,
      lastName: "Teste",
      birthDate: "1945-06-12",
      scholarship: "fundamental",
    });

  expect(profileRes.status).toBe(201);
  perfilId = profileRes.body.id;
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: perfilId ?? -1 } });
  await prisma.$disconnect();
});

afterEach(async () => {
  if (createdIds.length > 0) {
    await prisma.intercorrence.deleteMany({
      where: { id: { in: createdIds } },
    });
    createdIds.length = 0;
  }
});

describe("POST /perfis/:perfilId/intercorrencias", () => {
  it("creates an intercorrence with valid data", async () => {
    const res = await request(app)
      .post(`/perfis/${perfilId}/intercorrencias`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        eventType: "fall",
        isCritical: true,
        description: "Fell in the bathroom",
      });

    expect(res.status).toBe(201);
    expect(res.body.eventType).toBe("fall");
    expect(res.body.isCritical).toBe(true);
    expect(res.body.description).toBe("Fell in the bathroom");
    expect(res.body.profileId).toBe(perfilId);

    createdIds.push(res.body.id);
  });
  it("defaults description to an empty string when omitted", async () => {
    const res = await request(app)
      .post(`/perfis/${perfilId}/intercorrencias`)
      .set("Authorization", `Bearer ${token}`)
      .send({ eventType: "fever", isCritical: false });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe("");

    createdIds.push(res.body.id);
  });
  it("accepts the breathing_difficulties event type", async () => {
    const res = await request(app)
      .post(`/perfis/${perfilId}/intercorrencias`)
      .set("Authorization", `Bearer ${token}`)
      .send({ eventType: "breathing_difficulties", isCritical: true });

    expect(res.status).toBe(201);
    expect(res.body.eventType).toBe("breathing_difficulties");

    createdIds.push(res.body.id);
  });

  it("rejects an invalid eventType", async () => {
    const res = await request(app)
      .post(`/perfis/${perfilId}/intercorrencias`)
      .set("Authorization", `Bearer ${token}`)
      .send({ eventType: "WRONG", isSevere: false });

    expect(res.status).toBe(400);
  });

  it("rejects a missing isCritical", async () => {
    const res = await request(app)
      .post(`/perfis/${perfilId}/intercorrencias`)
      .set("Authorization", `Bearer ${token}`)
      .send({ eventType: "fall" });

    expect(res.status).toBe(400);
  });

  it("rejects requests without a valid token", async () => {
    const res = await request(app)
      .post(`/perfis/${perfilId}/intercorrencias`)
      .send({ eventType: "fall", isCritical: false });

    expect(res.status).toBe(401);
  });

  it("returns 404 for a nonexistent perfilId", async () => {
    const res = await request(app)
      .post(`/perfis/999999999/intercorrencias`)
      .set("Authorization", `Bearer ${token}`)
      .send({ eventType: "fall", isCritical: false });

    expect(res.status).toBe(404);
  });
});

describe("GET /perfis/:perfilId/intercorrencias", () => {
  it("lists intercorrences for the profile, most recent first", async () => {
    const first = await request(app)
      .post(`/perfis/${perfilId}/intercorrencias`)
      .set("Authorization", `Bearer ${token}`)
      .send({ eventType: "fall", isCritical: false, description: "first" });
    createdIds.push(first.body.id);

    const second = await request(app)
      .post(`/perfis/${perfilId}/intercorrencias`)
      .set("Authorization", `Bearer ${token}`)
      .send({ eventType: "fever", isCritical: true, description: "second" });
    createdIds.push(second.body.id);

    const res = await request(app)
      .get(`/perfis/${perfilId}/intercorrencias`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const ids = res.body.map((i: { id: number }) => i.id);
    expect(ids.indexOf(second.body.id)).toBeLessThan(
      ids.indexOf(first.body.id),
    );
  });
});

describe("DELETE /perfis/:perfilId/intercorrencias/:id", () => {
  it("deletes an existing intercorrence", async () => {
    const created = await request(app)
      .post(`/perfis/${perfilId}/intercorrencias`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        eventType: "bleeding",
        isCritical: true,
        description: "cut on hand",
      });

    const res = await request(app)
      .delete(`/perfis/${perfilId}/intercorrencias/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);

    const check = await prisma.intercorrence.findUnique({
      where: { id: created.body.id },
    });
    expect(check).toBeNull();
  });

  it("returns 404 when deleting a nonexistent intercorrence", async () => {
    const res = await request(app)
      .delete(`/perfis/${perfilId}/intercorrencias/999999999`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

/**
 * A critical intercorrence now notifies the rest of the care team. The contract
 * this suite protects is that recording the event never depends on that
 * succeeding: the profile is linked to a professional whose only registered
 * device has deliberately invalid encryption keys, so the send fails, and the
 * caregiver's response must be exactly what it was before push existed.
 */
describe("push dispatch on a critical intercorrence", () => {
  const PUSH_ENDPOINT = "https://test.example/intercorrence/pro";

  beforeAll(async () => {
    await grantProfileAccess(perfilId, "profissional@demo.com");

    const professional = await prisma.user.findUnique({
      where: { email: "profissional@demo.com" },
    });

    await prisma.pushSubscription.create({
      data: {
        userId: professional!.id,
        transport: "webpush",
        endpoint: PUSH_ENDPOINT,
        p256dh: "not-a-real-key",
        auth: "not-a-real-auth",
      },
    });
  });

  afterAll(async () => {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: PUSH_ENDPOINT },
    });
  });

  it("still answers 201 with the created intercorrence when the send fails", async () => {
    const res = await request(app)
      .post(`/perfis/${perfilId}/intercorrencias`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        eventType: "bleeding",
        isCritical: true,
        description: "sangramento no braço",
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      profileId: perfilId,
      eventType: "bleeding",
      isCritical: true,
      description: "sangramento no braço",
    });

    createdIds.push(res.body.id);
  });

  it("keeps a failed delivery from pruning a subscription that is merely unreachable", async () => {
    const res = await request(app)
      .post(`/perfis/${perfilId}/intercorrencias`)
      .set("Authorization", `Bearer ${token}`)
      .send({ eventType: "fall", isCritical: true });

    expect(res.status).toBe(201);
    createdIds.push(res.body.id);

    await new Promise((resolve) => setTimeout(resolve, 200));

    const survived = await prisma.pushSubscription.count({
      where: { endpoint: PUSH_ENDPOINT },
    });
    expect(survived).toBe(1);
  });
});
