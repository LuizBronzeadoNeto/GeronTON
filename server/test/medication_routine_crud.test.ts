import { describe, it, expect, afterAll, beforeAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

let caregiverToken: string;
let professionalToken: string;
let otherCaregiverToken: string;
let profileId: number;

const PROFILE_MARKER = "TestNested";
const OTHER_CAREGIVER_EMAIL = "othernested@test.com";

async function login(email: string, password: string): Promise<request.Response> {
  return request(app).post("/login").send({ email, password });
}

beforeAll(async () => {
  const caregiverRes = await login("cuidador@demo.com", "senha123");
  caregiverToken = caregiverRes.body.token;

  const professionalRes = await login("profissional@demo.com", "senha123");
  professionalToken = professionalRes.body.token;

  await request(app)
    .post("/cuidadores")
    .set("Authorization", `Bearer ${professionalToken}`)
    .send({ email: OTHER_CAREGIVER_EMAIL, password: "pass123" });
  otherCaregiverToken = (await login(OTHER_CAREGIVER_EMAIL, "pass123")).body.token;

  const profileRes = await request(app)
    .post("/perfis")
    .set("Authorization", `Bearer ${caregiverToken}`)
    .send({
      firstName: PROFILE_MARKER,
      lastName: "Souza",
      birthDate: "1948-03-10",
      scholarship: "ensino médio",
    });
  profileId = profileRes.body.id;
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { firstName: PROFILE_MARKER } });
  await prisma.user.deleteMany({ where: { email: OTHER_CAREGIVER_EMAIL } });
  await prisma.$disconnect();
});

/**
 * Integration tests for the nested /perfis/:perfilId/medicamentos and
 * /perfis/:perfilId/rotinas CRUD. These hit the real database.
 */
describe("/perfis/:perfilId/medicamentos", () => {
  let medicationId: number;

  it("creates a medication on the profile", async () => {
    const res = await request(app)
      .post(`/perfis/${profileId}/medicamentos`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ name: "Losartana", dosage: "50mg", frequency: "1x ao dia", notes: "manhã" });

    expect(res.status).toBe(201);
    expect(res.body.profileId).toBe(profileId);
    medicationId = res.body.id;
  });

  it("rejects creation with missing fields, 400", async () => {
    const res = await request(app)
      .post(`/perfis/${profileId}/medicamentos`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ name: "Losartana" });

    expect(res.status).toBe(400);
  });

  it("forbids another caregiver from adding a medication, 403", async () => {
    const res = await request(app)
      .post(`/perfis/${profileId}/medicamentos`)
      .set("Authorization", `Bearer ${otherCaregiverToken}`)
      .send({ name: "X", dosage: "1", frequency: "1x" });

    expect(res.status).toBe(403);
  });

  it("lists the profile's medications", async () => {
    const res = await request(app)
      .get(`/perfis/${profileId}/medicamentos`)
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((m: { id: number }) => m.id === medicationId)).toBe(true);
  });

  it("updates a medication", async () => {
    const res = await request(app)
      .put(`/perfis/${profileId}/medicamentos/${medicationId}`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ dosage: "100mg" });

    expect(res.status).toBe(200);
    expect(res.body.dosage).toBe("100mg");
  });

  it("returns 404 for a medication not on the profile", async () => {
    const res = await request(app)
      .get(`/perfis/${profileId}/medicamentos/999999`)
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(res.status).toBe(404);
  });

  it("deletes a medication, then 404 on re-fetch", async () => {
    const del = await request(app)
      .delete(`/perfis/${profileId}/medicamentos/${medicationId}`)
      .set("Authorization", `Bearer ${caregiverToken}`);
    expect(del.status).toBe(204);

    const res = await request(app)
      .get(`/perfis/${profileId}/medicamentos/${medicationId}`)
      .set("Authorization", `Bearer ${caregiverToken}`);
    expect(res.status).toBe(404);
  });
});

describe("/perfis/:perfilId/rotinas", () => {
  let routineId: number;

  it("creates a routine on the profile", async () => {
    const res = await request(app)
      .post(`/perfis/${profileId}/rotinas`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ title: "Caminhada", period: "manhã", description: "30 minutos" });

    expect(res.status).toBe(201);
    expect(res.body.profileId).toBe(profileId);
    routineId = res.body.id;
  });

  it("rejects creation with missing fields, 400", async () => {
    const res = await request(app)
      .post(`/perfis/${profileId}/rotinas`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ title: "Caminhada" });

    expect(res.status).toBe(400);
  });

  it("forbids another caregiver from adding a routine, 403", async () => {
    const res = await request(app)
      .post(`/perfis/${profileId}/rotinas`)
      .set("Authorization", `Bearer ${otherCaregiverToken}`)
      .send({ title: "X", period: "tarde" });

    expect(res.status).toBe(403);
  });

  it("lists the profile's routines", async () => {
    const res = await request(app)
      .get(`/perfis/${profileId}/rotinas`)
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((r: { id: number }) => r.id === routineId)).toBe(true);
  });

  it("updates a routine", async () => {
    const res = await request(app)
      .put(`/perfis/${profileId}/rotinas/${routineId}`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ period: "tarde" });

    expect(res.status).toBe(200);
    expect(res.body.period).toBe("tarde");
  });

  it("deletes a routine, then 404 on re-fetch", async () => {
    const del = await request(app)
      .delete(`/perfis/${profileId}/rotinas/${routineId}`)
      .set("Authorization", `Bearer ${caregiverToken}`);
    expect(del.status).toBe(204);

    const res = await request(app)
      .get(`/perfis/${profileId}/rotinas/${routineId}`)
      .set("Authorization", `Bearer ${caregiverToken}`);
    expect(res.status).toBe(404);
  });
});
