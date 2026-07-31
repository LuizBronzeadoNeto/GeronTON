import { describe, it, expect, afterAll, beforeAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { makeCpf } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

let caregiverToken: string;
let professionalToken: string;
let otherCaregiverToken: string;
let caregiverId: number;
let profileId: number;

const PROFILE_MARKER = "TestIdoso";
const OTHER_CAREGIVER_EMAIL = "othercaregiver@test.com";
const PROFILE_CPF = makeCpf("100000005");
const PROFILE_BIRTH_DATE = "1950-05-20";

async function login(
  email: string,
  password: string,
): Promise<request.Response> {
  return request(app).post("/login").send({ email, password });
}

beforeAll(async () => {
  const caregiverRes = await login("cuidador@demo.com", "senha123");
  caregiverToken = caregiverRes.body.token;
  caregiverId = caregiverRes.body.id;

  const professionalRes = await login("profissional@demo.com", "senha123");
  professionalToken = professionalRes.body.token;

  await request(app)
    .post("/cuidadores")
    .set("Authorization", `Bearer ${professionalToken}`)
    .send({ email: OTHER_CAREGIVER_EMAIL, password: "pass1234" });
  const otherRes = await login(OTHER_CAREGIVER_EMAIL, "pass1234");
  otherCaregiverToken = otherRes.body.token;
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { firstName: PROFILE_MARKER } });
  await prisma.user.deleteMany({ where: { email: OTHER_CAREGIVER_EMAIL } });
  await prisma.$disconnect();
});

/**
 * Integration tests for the /perfis CRUD. These hit the real database, so
 * Postgres must be running, migrated, and seeded.
 */
describe("/perfis", () => {
  it("creates a profile owned by the requesting caregiver", async () => {
    const res = await request(app)
      .post("/perfis")
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({
        cpf: PROFILE_CPF,
        firstName: PROFILE_MARKER,
        lastName: "Silva",
        birthDate: PROFILE_BIRTH_DATE,
        scholarship: "ensino fundamental",
        medicalConditions: ["hipertensão"],
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body.caregiverId).toBe(caregiverId);
    profileId = res.body.id;
  });

  it("rejects creation when required fields are missing, 400", async () => {
    const res = await request(app)
      .post("/perfis")
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ firstName: PROFILE_MARKER });

    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated access, 401", async () => {
    const res = await request(app).get("/perfis");
    expect(res.status).toBe(401);
  });

  it("lists only the caregiver's own profiles", async () => {
    const res = await request(app)
      .get("/perfis")
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(
      res.body.every(
        (p: { caregiverId: number }) => p.caregiverId === caregiverId,
      ),
    ).toBe(true);
    expect(res.body.some((p: { id: number }) => p.id === profileId)).toBe(true);
  });

  it("hides a profile from a professional who is not linked to it", async () => {
    const res = await request(app)
      .get("/perfis")
      .set("Authorization", `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((p: { id: number }) => p.id === profileId)).toBe(
      false,
    );
  });

  it("lists the profile for a professional once they are linked to it", async () => {
    const link = await request(app)
      .post("/perfis/vincular")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ cpf: PROFILE_CPF, birthDate: PROFILE_BIRTH_DATE });
    expect(link.status).toBe(201);

    const res = await request(app)
      .get("/perfis")
      .set("Authorization", `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((p: { id: number }) => p.id === profileId)).toBe(true);
  });

  it("lets the owner fetch the profile", async () => {
    const res = await request(app)
      .get(`/perfis/${profileId}`)
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(profileId);
  });

  it("lets a linked professional fetch the profile", async () => {
    await request(app)
      .post("/perfis/vincular")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ cpf: PROFILE_CPF, birthDate: PROFILE_BIRTH_DATE });

    const res = await request(app)
      .get(`/perfis/${profileId}`)
      .set("Authorization", `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
  });

  it("forbids another caregiver from fetching the profile, 403", async () => {
    const res = await request(app)
      .get(`/perfis/${profileId}`)
      .set("Authorization", `Bearer ${otherCaregiverToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent profile", async () => {
    const res = await request(app)
      .get("/perfis/999999")
      .set("Authorization", `Bearer ${professionalToken}`);

    expect(res.status).toBe(404);
  });

  it("lets the owner update the profile", async () => {
    const res = await request(app)
      .put(`/perfis/${profileId}`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ scholarship: "ensino médio" });

    expect(res.status).toBe(200);
    expect(res.body.scholarship).toBe("ensino médio");
  });

  it("lets the owner delete the profile, then 404 on re-fetch", async () => {
    const del = await request(app)
      .delete(`/perfis/${profileId}`)
      .set("Authorization", `Bearer ${caregiverToken}`);
    expect(del.status).toBe(204);

    const res = await request(app)
      .get(`/perfis/${profileId}`)
      .set("Authorization", `Bearer ${caregiverToken}`);
    expect(res.status).toBe(404);
  });
});
