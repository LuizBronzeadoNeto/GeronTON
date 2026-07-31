import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { makeCpf } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

let caregiverToken: string;
let professionalToken: string;
let outsiderToken: string;
let profileId: number;

const PROFILE_MARKER = "TestAcesso";
const OUTSIDER_EMAIL = "outsider.pro@test.com";
const OUTSIDER_CRM = "77777-PB";
const PROFILE_CPF = makeCpf("100000030");
const PROFILE_BIRTH_DATE = "1944-08-21";
const WRONG_BIRTH_DATE = "1944-08-22";
const UNKNOWN_CPF = makeCpf("100000031");

/**
 * Access-control tests for the link model. The subject here is who can reach an
 * elder's record, which used to be "any profissional, always" — the single most
 * sensitive behaviour in the product, so it gets a suite of its own rather than
 * riding along in the CRUD tests.
 *
 * `outsider` is a second professional with no link to the fixture profile.
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

  await request(app)
    .post("/profissionais")
    .set("Authorization", `Bearer ${professionalToken}`)
    .send({
      email: OUTSIDER_EMAIL,
      password: "pass123",
      crm: OUTSIDER_CRM,
    });

  const outsiderRes = await request(app)
    .post("/login")
    .send({ email: OUTSIDER_EMAIL, password: "pass123" });
  expect(outsiderRes.status).toBe(200);
  outsiderToken = outsiderRes.body.token;

  const profileRes = await request(app)
    .post("/perfis")
    .set("Authorization", `Bearer ${caregiverToken}`)
    .send({
      cpf: PROFILE_CPF,
      firstName: PROFILE_MARKER,
      lastName: "Silva",
      birthDate: PROFILE_BIRTH_DATE,
      scholarship: "fundamental",
    });
  expect(profileRes.status).toBe(201);
  profileId = profileRes.body.id;

  await prisma.alert.create({
    data: {
      profileId,
      type: "clinical_warning",
      severity: "attention",
      message: "Alerta de teste de acesso",
    },
  });
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: profileId ?? -1 } });
  await prisma.user.deleteMany({ where: { email: OUTSIDER_EMAIL } });
  await prisma.$disconnect();
});

describe("an unlinked professional", () => {
  it("is forbidden from fetching the profile", async () => {
    const res = await request(app)
      .get(`/perfis/${profileId}`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });

  it("is forbidden from the profile's nested resources", async () => {
    for (const resource of ["medicamentos", "rotinas", "avaliacoes", "risco"]) {
      const res = await request(app)
        .get(`/perfis/${profileId}/${resource}`)
        .set("Authorization", `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    }
  });

  it("does not see the profile in GET /perfis", async () => {
    const res = await request(app)
      .get("/perfis")
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((p: { id: number }) => p.id === profileId)).toBe(
      false,
    );
  });

  it("does not see the profile in the triage panel", async () => {
    const res = await request(app)
      .get("/triagem")
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.some((p: { id: number }) => p.id === profileId)).toBe(
      false,
    );
  });

  it("does not see the profile's alerts in the dashboard feed", async () => {
    const res = await request(app)
      .get("/alertas")
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(res.status).toBe(200);
    expect(
      res.body.some((a: { profileId: number }) => a.profileId === profileId),
    ).toBe(false);
  });

  it("cannot write to the profile", async () => {
    const res = await request(app)
      .put(`/perfis/${profileId}`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ scholarship: "superior" });

    expect(res.status).toBe(403);
  });
});

describe("POST /perfis/verificar", () => {
  it("reports an unknown CPF as new", async () => {
    const res = await request(app)
      .post("/perfis/verificar")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ cpf: UNKNOWN_CPF, birthDate: PROFILE_BIRTH_DATE });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "novo" });
  });

  it("confirms a known CPF when the birth date matches", async () => {
    const res = await request(app)
      .post("/perfis/verificar")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ cpf: PROFILE_CPF, birthDate: PROFILE_BIRTH_DATE });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "encontrado" });
  });

  it("refuses a known CPF when the birth date does not match", async () => {
    const res = await request(app)
      .post("/perfis/verificar")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ cpf: PROFILE_CPF, birthDate: WRONG_BIRTH_DATE });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "nao_confere" });
  });

  it("never discloses the elder's identity", async () => {
    const res = await request(app)
      .post("/perfis/verificar")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ cpf: PROFILE_CPF, birthDate: PROFILE_BIRTH_DATE });

    expect(Object.keys(res.body)).toEqual(["status"]);
  });

  it("rejects an invalid CPF", async () => {
    const res = await request(app)
      .post("/perfis/verificar")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ cpf: "11111111111", birthDate: PROFILE_BIRTH_DATE });

    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated callers", async () => {
    const res = await request(app)
      .post("/perfis/verificar")
      .send({ cpf: PROFILE_CPF, birthDate: PROFILE_BIRTH_DATE });

    expect(res.status).toBe(401);
  });
});

describe("POST /perfis/vincular", () => {
  it("refuses to bind when the birth date does not match", async () => {
    const res = await request(app)
      .post("/perfis/vincular")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ cpf: PROFILE_CPF, birthDate: WRONG_BIRTH_DATE });

    expect(res.status).toBe(404);

    const still = await request(app)
      .get(`/perfis/${profileId}`)
      .set("Authorization", `Bearer ${outsiderToken}`);
    expect(still.status).toBe(403);
  });

  it("grants full access once CPF and birth date both match", async () => {
    const link = await request(app)
      .post("/perfis/vincular")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ cpf: PROFILE_CPF, birthDate: PROFILE_BIRTH_DATE });

    expect(link.status).toBe(201);
    expect(link.body.id).toBe(profileId);

    const detail = await request(app)
      .get(`/perfis/${profileId}`)
      .set("Authorization", `Bearer ${outsiderToken}`);
    expect(detail.status).toBe(200);

    const list = await request(app)
      .get("/perfis")
      .set("Authorization", `Bearer ${outsiderToken}`);
    expect(list.body.some((p: { id: number }) => p.id === profileId)).toBe(
      true,
    );

    const triage = await request(app)
      .get("/triagem")
      .set("Authorization", `Bearer ${outsiderToken}`);
    expect(triage.body.some((p: { id: number }) => p.id === profileId)).toBe(
      true,
    );

    const alerts = await request(app)
      .get("/alertas")
      .set("Authorization", `Bearer ${outsiderToken}`);
    expect(
      alerts.body.some((a: { profileId: number }) => a.profileId === profileId),
    ).toBe(true);
  });

  it("is idempotent when the same user binds twice", async () => {
    const res = await request(app)
      .post("/perfis/vincular")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ cpf: PROFILE_CPF, birthDate: PROFILE_BIRTH_DATE });

    expect(res.status).toBe(201);

    const links = await prisma.profileAccess.count({ where: { profileId } });
    expect(links).toBe(2);
  });

  it("returns 404 for a CPF nobody has registered", async () => {
    const res = await request(app)
      .post("/perfis/vincular")
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ cpf: UNKNOWN_CPF, birthDate: PROFILE_BIRTH_DATE });

    expect(res.status).toBe(404);
  });
});

describe("POST /perfis", () => {
  it("refuses a duplicate CPF with 409", async () => {
    const res = await request(app)
      .post("/perfis")
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({
        cpf: PROFILE_CPF,
        firstName: PROFILE_MARKER,
        lastName: "Duplicado",
        birthDate: PROFILE_BIRTH_DATE,
        scholarship: "fundamental",
      });

    expect(res.status).toBe(409);
  });

  it("refuses a CPF that fails its check digits", async () => {
    const res = await request(app)
      .post("/perfis")
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({
        cpf: "12345678900",
        firstName: PROFILE_MARKER,
        lastName: "Invalido",
        birthDate: PROFILE_BIRTH_DATE,
        scholarship: "fundamental",
      });

    expect(res.status).toBe(400);
  });

  it("links the creator so a new profile is never orphaned", async () => {
    const links = await prisma.profileAccess.findMany({ where: { profileId } });
    const caregiver = await prisma.user.findUnique({
      where: { email: "cuidador@demo.com" },
    });

    expect(links.some((link) => link.userId === caregiver!.id)).toBe(true);
  });
});
