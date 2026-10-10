import { describe, it, expect, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { CONSENT_VERSION } from "../src/config/consent.js";

const WITH_TERMS = "consentiu@test.com";
const WITHOUT_TERMS = "semconsentimento@test.com";
const PASSWORD = "senha12345";

afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { in: [WITH_TERMS, WITHOUT_TERMS] } },
  });
  await prisma.$disconnect();
});

function login(email: string) {
  return request(app).post("/login").send({ email, password: PASSWORD });
}

/**
 * Consent term (SCRUM-14): stored at sign-up when the box was ticked,
 * reported on login, and recorded later through POST /consentimento.
 */
describe("consent", () => {
  it("stores consent given at sign-up and does not ask again", async () => {
    const res = await request(app)
      .post("/cuidadores")
      .send({ email: WITH_TERMS, password: PASSWORD, acceptedTerms: true });
    expect(res.status).toBe(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: WITH_TERMS },
    });
    expect(user.consentVersion).toBe(CONSENT_VERSION);
    expect(user.consentAcceptedAt).not.toBeNull();

    const loginRes = await login(WITH_TERMS);
    expect(loginRes.body.consentRequired).toBe(false);
  });

  it("asks for consent on login until it is given", async () => {
    await request(app)
      .post("/cuidadores")
      .send({ email: WITHOUT_TERMS, password: PASSWORD });

    const first = await login(WITHOUT_TERMS);
    expect(first.body.consentRequired).toBe(true);

    const accept = await request(app)
      .post("/consentimento")
      .set("Authorization", `Bearer ${first.body.token}`)
      .send({ version: CONSENT_VERSION });
    expect(accept.status).toBe(200);
    expect(accept.body.consentVersion).toBe(CONSENT_VERSION);

    const second = await login(WITHOUT_TERMS);
    expect(second.body.consentRequired).toBe(false);
  });

  it("refuses a version other than the current one", async () => {
    const { body } = await login(WITHOUT_TERMS);

    const res = await request(app)
      .post("/consentimento")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ version: "2020-01-01" });

    expect(res.status).toBe(400);
  });

  it("requires a session", async () => {
    const res = await request(app)
      .post("/consentimento")
      .send({ version: CONSENT_VERSION });

    expect(res.status).toBe(401);
  });
});
