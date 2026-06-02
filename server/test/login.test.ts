import { describe, it, expect, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { pool } from "../src/db.js";

afterAll(async () => {
  await pool.end();
});

/**
 * Integration tests for POST /login. These hit the real database, so Postgres
 * must be running and seeded (see docker-compose.yml + db/seed.sql).
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
  });

  it("returns id and role for a valid healthcare professional", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "profissional@demo.com", password: "senha123" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ role: "profissional" });
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
});
