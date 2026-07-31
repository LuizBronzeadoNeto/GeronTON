import { describe, it, expect, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

afterAll(async () => {
  await prisma.$disconnect();
});

/**
 * Integration tests for POST /login. These hit the real database, so Postgres
 * must be running, migrated, and seeded (see docker-compose.yml + prisma db seed).
 */
describe("POST /login", () => {
  it("returns id and role for a valid caregiver", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "cuidador@demo.com", password: "senha123" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ role: "cuidador" });
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body.password).toBeUndefined();
    expect(res.body.token).toBeDefined();
  });

  it("returns id and role for a valid healthcare professional", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "profissional@demo.com", password: "senha123" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ role: "profissional" });
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body.password).toBeUndefined();
    expect(res.body.token).toBeDefined();
  });

  it("responds 401 on a wrong password", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "cuidador@demo.com", password: "wrong" });

    expect(res.status).toBe(401);
  });

  it("responds 400 when fields are missing", async () => {
    const res = await request(app).post("/login").send({});
    expect(res.status).toBe(400);
  });

  it("stores the password as a bcrypt hash, never as plain text", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "cuidador@demo.com" },
    });

    expect(user).not.toBeNull();
    expect(user?.password).not.toBe("senha123");
    expect(user?.password).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it("omits the email from the issued token", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "cuidador@demo.com", password: "senha123" });

    const payload = JSON.parse(
      Buffer.from(res.body.token.split(".")[1], "base64").toString(),
    );

    expect(payload).toMatchObject({ role: "cuidador" });
    expect(payload.email).toBeUndefined();
  });
});
