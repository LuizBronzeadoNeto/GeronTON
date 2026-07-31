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
        in: [
          "newcaregiver@demo.com",
          "selfsignup.care@demo.com",
          "crmignored.care@demo.com",
        ],
      },
    },
  });
  await prisma.$disconnect();
});

/**
 * Integration tests for POST /cuidadores. These hit the real database to
 * retrieve the tokens, so Postgres must be running, migrated, and seeded
 * (see docker-compose.yml + prisma db seed).
 */
describe("POST /cuidadores", () => {
  it("Authorized creation. Returns id, email and role of the new caregiver", async () => {
    const res = await request(app)
      .post("/cuidadores")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ email: "newcaregiver@demo.com", password: "pass1234" });

    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body).toMatchObject({
      email: "newcaregiver@demo.com",
      role: "cuidador",
    });
    expect(res.body.password).toBeUndefined();
  });

  it("Denies the creation of a duplicate caregiver, returns 409", async () => {
    const res = await request(app)
      .post("/cuidadores")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ email: "newcaregiver@demo.com", password: "pass1234" });

    expect(res.status).toBe(409);
  });

  it("Allows an unauthenticated visitor to sign up", async () => {
    const res = await request(app)
      .post("/cuidadores")
      .send({ email: "selfsignup.care@demo.com", password: "pass1234" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ role: "cuidador" });
  });

  it("Rejects a password shorter than the minimum, returns 400", async () => {
    const res = await request(app)
      .post("/cuidadores")
      .send({ email: "shortpass.care@demo.com", password: "curta12" });

    expect(res.status).toBe(400);
  });

  it("Ignores a CRM sent for a caregiver", async () => {
    const res = await request(app).post("/cuidadores").send({
      email: "crmignored.care@demo.com",
      password: "pass1234",
      crm: "55555-PB",
    });

    expect(res.status).toBe(201);
    expect(res.body.crm).toBeNull();
  });

  it("Denies the creation of a caregiver without providing a password, returns 400", async () => {
    const res = await request(app)
      .post("/cuidadores")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ email: "anothercaregiver@demo.com" });

    expect(res.status).toBe(400);
  });

  it("Denies the creation of a caregiver without providing an email, returns 400", async () => {
    const res = await request(app)
      .post("/cuidadores")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ password: "pass1234" });

    expect(res.status).toBe(400);
  });

  it("Allows a newly created caregiver to log in", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "newcaregiver@demo.com", password: "pass1234" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ role: "cuidador" });
    expect(res.body.token).toBeDefined();
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body.password).toBeUndefined();
  });
});
