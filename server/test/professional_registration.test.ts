import { describe, it, expect, afterAll, beforeAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

let professionalToken: string;

beforeAll(async () => {
  const professionalRes = await request(app)
    .post("/login")
    .send({ email: "profissional@demo.com", password: "senha123" });
  professionalToken = professionalRes.body.token;
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ["newprofessional@demo.com", "selfsignup.pro@demo.com"],
      },
    },
  });
  await prisma.$disconnect();
});

/**
 * Integration tests for POST /profissionais. These hit the real database to
 * retrieve the tokens, so Postgres must be running, migrated, and seeded
 * (see docker-compose.yml + prisma db seed).
 */
describe("POST /profissionais", () => {
  it("Authorizes creation. Returns id, email and role of the new professional", async () => {
    const res = await request(app)
      .post("/profissionais")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({
        email: "newprofessional@demo.com",
        password: "pass1234",
        crm: "54321-PB",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body).toMatchObject({
      email: "newprofessional@demo.com",
      role: "profissional",
    });
    expect(res.body.password).toBeUndefined();
  });

  it("Denies the creation of a duplicate professional, returns 409 conflict", async () => {
    const res = await request(app)
      .post("/profissionais")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({
        email: "newprofessional@demo.com",
        password: "pass1234",
        crm: "99999-PB",
      });

    expect(res.status).toBe(409);
  });

  it("Allows an unauthenticated visitor to sign up", async () => {
    const res = await request(app).post("/profissionais").send({
      email: "selfsignup.pro@demo.com",
      password: "pass1234",
      crm: "33333-PB",
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ role: "profissional" });
  });

  it("Rejects a password shorter than the minimum, returns 400", async () => {
    const res = await request(app).post("/profissionais").send({
      email: "shortpass.pro@demo.com",
      password: "curta12",
      crm: "44444-PB",
    });

    expect(res.status).toBe(400);
  });

  it("Denies the creation of a professional without providing a password, returns 400", async () => {
    const res = await request(app)
      .post("/profissionais")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ email: "deniedprofessional@demo.com" });

    expect(res.status).toBe(400);
  });

  it("Denies the creation of a professional without providing an email, returns 400", async () => {
    const res = await request(app)
      .post("/profissionais")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ password: "pass1234", crm: "22222-PB" });

    expect(res.status).toBe(400);
  });

  it("Denies the creation of a professional without a CRM, returns 400", async () => {
    const res = await request(app)
      .post("/profissionais")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ email: "nocrm@demo.com", password: "pass1234" });

    expect(res.status).toBe(400);
  });

  it("Denies the creation of a professional with a malformed CRM, returns 400", async () => {
    const res = await request(app)
      .post("/profissionais")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({
        email: "badcrm@demo.com",
        password: "pass1234",
        crm: "12345-XX",
      });

    expect(res.status).toBe(400);
  });

  it("Allows a newly created professional to log in", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "newprofessional@demo.com", password: "pass1234" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ role: "profissional" });
    expect(res.body.token).toBeDefined();
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body.password).toBeUndefined();
  });
});
