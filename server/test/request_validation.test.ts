import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

let caregiverToken: string;
let professionalToken: string;
let perfilId: number;

/**
 * Malformed-request regression tests: ids and bodies that used to leak Prisma
 * errors (responding 500) must be rejected with a 400 before touching the
 * database.
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

  const profileRes = await request(app)
    .post("/perfis")
    .set("Authorization", `Bearer ${caregiverToken}`)
    .send({
      firstName: "Validacao",
      lastName: "Teste",
      birthDate: "1944-04-04",
      scholarship: "fundamental",
    });
  expect(profileRes.status).toBe(201);
  perfilId = profileRes.body.id;
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: perfilId } });
});

describe("non-numeric sub-resource ids", () => {
  it.each([["avaliacoes"], ["medicamentos"], ["rotinas"]] as const)(
    "responds 400 on GET/PUT/DELETE /%s/abc",
    async (resource) => {
      const path = `/perfis/${perfilId}/${resource}/abc`;

      const getRes = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${caregiverToken}`);
      expect(getRes.status).toBe(400);

      const putRes = await request(app)
        .put(path)
        .set("Authorization", `Bearer ${caregiverToken}`)
        .send({});
      expect(putRes.status).toBe(400);

      const deleteRes = await request(app)
        .delete(path)
        .set("Authorization", `Bearer ${caregiverToken}`);
      expect(deleteRes.status).toBe(400);
    },
  );
});

describe("POST /perfis caregiver assignment", () => {
  it("responds 400 when a professional assigns a nonexistent caregiver", async () => {
    const res = await request(app)
      .post("/perfis")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({
        firstName: "Sem",
        lastName: "Dono",
        birthDate: "1944-04-04",
        scholarship: "fundamental",
        caregiverId: 999999999,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("caregiverId");
  });
});

describe("registration body types", () => {
  it("responds 400 when email or password is not a string", async () => {
    const res = await request(app)
      .post("/cuidadores")
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ email: 123, password: { evil: true } });

    expect(res.status).toBe(400);
  });
});
