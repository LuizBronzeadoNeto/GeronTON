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
import { grantProfileAccess, makeCpf, signUpProfessional } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

const OTHER_PRO_EMAIL = "falsonegativo.pro@test.com";

let caregiverToken: string;
let professionalToken: string;
let otherProToken: string;
let perfilId: number;

/**
 * False negative records (SCRUM-11). One dedicated profile, linked to the
 * seeded caregiver and professional plus a second professional used to check
 * that nobody can delete someone else's record.
 */
beforeAll(async () => {
  caregiverToken = (
    await request(app)
      .post("/login")
      .send({ email: "cuidador@demo.com", password: "senha123" })
  ).body.token;
  professionalToken = (
    await request(app)
      .post("/login")
      .send({ email: "profissional@demo.com", password: "senha123" })
  ).body.token;
  otherProToken = await signUpProfessional(OTHER_PRO_EMAIL, "77001-PB");

  const profileRes = await request(app)
    .post("/perfis")
    .set("Authorization", `Bearer ${caregiverToken}`)
    .send({
      cpf: makeCpf("120000001"),
      firstName: "Sinal",
      lastName: "Perdido",
      birthDate: "1940-05-20",
      scholarship: "fundamental",
    });
  expect(profileRes.status).toBe(201);
  perfilId = profileRes.body.id;
  await grantProfileAccess(perfilId, "profissional@demo.com");
  await grantProfileAccess(perfilId, OTHER_PRO_EMAIL);
});

afterEach(async () => {
  await prisma.missedSignal.deleteMany({ where: { profileId: perfilId } });
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: perfilId ?? -1 } });
  await prisma.user.deleteMany({ where: { email: OTHER_PRO_EMAIL } });
  await prisma.$disconnect();
});

const VALID = {
  occurredAt: "2026-09-30",
  severity: "critical",
  description: "Internada por pneumonia, check-in da semana veio todo normal",
};

function post(body: Record<string, unknown>, token = professionalToken) {
  return request(app)
    .post(`/perfis/${perfilId}/sinais-nao-detectados`)
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}

function remaining() {
  return prisma.missedSignal.count({ where: { profileId: perfilId } });
}

describe("missed signals", () => {
  it("records a missed signal with the reporter", async () => {
    const res = await post(VALID);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      profileId: perfilId,
      severity: "critical",
      description: VALID.description,
    });
    expect(res.body.occurredAt.slice(0, 10)).toBe("2026-09-30");
    expect(res.body.reportedBy.email).toBe("profissional@demo.com");
  });

  it("lists the records newest first", async () => {
    await post({ ...VALID, occurredAt: "2026-08-01", description: "antigo" });
    await post({ ...VALID, occurredAt: "2026-09-01", description: "recente" });

    const res = await request(app)
      .get(`/perfis/${perfilId}/sinais-nao-detectados`)
      .set("Authorization", `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    const descriptions = res.body.map(
      (item: { description: string }) => item.description,
    );
    expect(descriptions).toEqual(["recente", "antigo"]);
  });

  it("rejects missing or invalid fields", async () => {
    const res = await post({
      occurredAt: "30/09/2026",
      severity: "grave",
      description: " ",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("occurredAt");
    expect(res.body.error).toContain("severity");
    expect(res.body.error).toContain("description");
  });

  it("rejects a date in the future", async () => {
    const res = await post({ ...VALID, occurredAt: "2999-01-01" });

    expect(res.status).toBe(400);
  });

  it("is off limits to caregivers", async () => {
    const postRes = await post(VALID, caregiverToken);
    const listRes = await request(app)
      .get(`/perfis/${perfilId}/sinais-nao-detectados`)
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(postRes.status).toBe(403);
    expect(listRes.status).toBe(403);
  });

  it("lets the reporter delete the record", async () => {
    const created = await post(VALID);

    const res = await request(app)
      .delete(`/perfis/${perfilId}/sinais-nao-detectados/${created.body.id}`)
      .set("Authorization", `Bearer ${professionalToken}`);

    expect(res.status).toBe(204);
    expect(await remaining()).toBe(0);
  });

  it("does not let another professional delete it", async () => {
    const created = await post(VALID);

    const res = await request(app)
      .delete(`/perfis/${perfilId}/sinais-nao-detectados/${created.body.id}`)
      .set("Authorization", `Bearer ${otherProToken}`);

    expect(res.status).toBe(403);
    expect(await remaining()).toBe(1);
  });

  it("answers 404 for a record that is not on the profile", async () => {
    const res = await request(app)
      .delete(`/perfis/${perfilId}/sinais-nao-detectados/999999`)
      .set("Authorization", `Bearer ${professionalToken}`);

    expect(res.status).toBe(404);
  });
});
