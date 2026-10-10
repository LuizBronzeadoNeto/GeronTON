import { describe, it, expect, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { grantProfileAccess, makeCpf } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

const PASSWORD = "senha12345";
const EMAILS = [
  "apagar.sozinho@test.com",
  "apagar.compartilhado@test.com",
  "apagar.outro@test.com",
  "apagar.senha@test.com",
];

afterAll(async () => {
  await prisma.profile.deleteMany({
    where: { lastName: "Exclusao" },
  });
  await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
  await prisma.$disconnect();
});

async function signUp(email: string): Promise<string> {
  await request(app)
    .post("/cuidadores")
    .send({ email, password: PASSWORD, acceptedTerms: true });
  const res = await request(app)
    .post("/login")
    .send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  return res.body.token;
}

async function createProfile(token: string, cpfBase: string): Promise<number> {
  const res = await request(app)
    .post("/perfis")
    .set("Authorization", `Bearer ${token}`)
    .send({
      cpf: makeCpf(cpfBase),
      firstName: "Idoso",
      lastName: "Exclusao",
      birthDate: "1941-04-02",
      scholarship: "fundamental",
    });
  expect(res.status).toBe(201);
  return res.body.id;
}

function deleteAccount(token: string, body: Record<string, unknown>) {
  return request(app)
    .delete("/conta")
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}

/**
 * Self-service account deletion. Each test uses its own account so the order
 * they run in doesn't matter.
 */
describe("DELETE /conta", () => {
  it("deletes the account and the elders nobody else can see", async () => {
    const token = await signUp(EMAILS[0]);
    const profileId = await createProfile(token, "130000001");

    const res = await deleteAccount(token, { password: PASSWORD });

    expect(res.status).toBe(204);
    expect(
      await prisma.user.findUnique({ where: { email: EMAILS[0] } }),
    ).toBeNull();
    expect(
      await prisma.profile.findUnique({ where: { id: profileId } }),
    ).toBeNull();

    const login = await request(app)
      .post("/login")
      .send({ email: EMAILS[0], password: PASSWORD });
    expect(login.status).toBe(401);
  });

  it("keeps a shared elder and hands it to the other linked user", async () => {
    const token = await signUp(EMAILS[1]);
    await signUp(EMAILS[2]);
    const profileId = await createProfile(token, "130000002");
    await grantProfileAccess(profileId, EMAILS[2]);
    const other = await prisma.user.findUniqueOrThrow({
      where: { email: EMAILS[2] },
    });

    const res = await deleteAccount(token, { password: PASSWORD });

    expect(res.status).toBe(204);
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: { access: true },
    });
    expect(profile?.caregiverId).toBe(other.id);
    expect(profile?.access.map((link) => link.userId)).toEqual([other.id]);
  });

  it("refuses a wrong password and keeps the account", async () => {
    const token = await signUp(EMAILS[3]);

    const res = await deleteAccount(token, { password: "errada123" });

    expect(res.status).toBe(403);
    expect(
      await prisma.user.findUnique({ where: { email: EMAILS[3] } }),
    ).not.toBeNull();
  });

  it("requires the password", async () => {
    const token = await signUp(EMAILS[3]);

    const res = await deleteAccount(token, {});

    expect(res.status).toBe(400);
  });

  it("requires a session", async () => {
    const res = await request(app)
      .delete("/conta")
      .send({ password: PASSWORD });

    expect(res.status).toBe(401);
  });
});
