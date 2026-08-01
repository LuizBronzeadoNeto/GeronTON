import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { makeCpf } from "./helpers.js";
import { resolveProfileAudience } from "../src/services/push.js";

let caregiverId: number;
let professionalId: number;
let outsiderId: number;
let profileId: number;

const PROFILE_MARKER = "TestAudiencia";
const PROFILE_CPF = makeCpf("110000001");
const OUTSIDER_EMAIL = "outsider.push@test.com";
const OUTSIDER_CRM = "77778-PB";
const FIXTURE_PREFIX = "https://test.example/audience/";

/**
 * Who hears about an elder. This is the authorization half of push: the
 * audience is derived from ProfileAccess, so a user is notified about exactly
 * the elders they are allowed to open, and never about anyone else's.
 *
 * outsider is a professional who has a registered device but no link to the
 * fixture profile — the case that would silently leak an elder's name onto a
 * stranger's lock screen if the audience query ever regressed.
 */
beforeAll(async () => {
  const caregiverRes = await request(app)
    .post("/login")
    .send({ email: "cuidador@demo.com", password: "senha123" });
  expect(caregiverRes.status).toBe(200);

  const professionalRes = await request(app)
    .post("/login")
    .send({ email: "profissional@demo.com", password: "senha123" });
  expect(professionalRes.status).toBe(200);

  await request(app).post("/profissionais").send({
    email: OUTSIDER_EMAIL,
    password: "pass1234",
    crm: OUTSIDER_CRM,
  });

  const [caregiver, professional, outsider] = await Promise.all([
    prisma.user.findUnique({ where: { email: "cuidador@demo.com" } }),
    prisma.user.findUnique({ where: { email: "profissional@demo.com" } }),
    prisma.user.findUnique({ where: { email: OUTSIDER_EMAIL } }),
  ]);
  caregiverId = caregiver!.id;
  professionalId = professional!.id;
  outsiderId = outsider!.id;

  const profileRes = await request(app)
    .post("/perfis")
    .set("Authorization", `Bearer ${caregiverRes.body.token}`)
    .send({
      cpf: PROFILE_CPF,
      firstName: PROFILE_MARKER,
      lastName: "Souza",
      birthDate: "1943-02-11",
      scholarship: "fundamental",
    });
  expect(profileRes.status).toBe(201);
  profileId = profileRes.body.id;

  await prisma.profileAccess.upsert({
    where: { profileId_userId: { profileId, userId: professionalId } },
    update: {},
    create: { profileId, userId: professionalId },
  });

  await prisma.pushSubscription.createMany({
    data: [
      {
        userId: caregiverId,
        transport: "webpush",
        endpoint: `${FIXTURE_PREFIX}caregiver`,
        p256dh: "p256dh-fixture",
        auth: "auth-fixture",
      },
      {
        userId: professionalId,
        transport: "expo",
        endpoint: "ExponentPushToken[test-audience-pro]",
      },
      {
        userId: outsiderId,
        transport: "webpush",
        endpoint: `${FIXTURE_PREFIX}outsider`,
        p256dh: "p256dh-fixture",
        auth: "auth-fixture",
      },
    ],
  });
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: profileId ?? -1 } });
  await prisma.user.deleteMany({ where: { email: OUTSIDER_EMAIL } });
  await prisma.pushSubscription.deleteMany({
    where: {
      OR: [
        { endpoint: { startsWith: FIXTURE_PREFIX } },
        { endpoint: "ExponentPushToken[test-audience-pro]" },
      ],
    },
  });
  await prisma.$disconnect();
});

describe("resolveProfileAudience", () => {
  /**
   * Asserts on the set of users rather than the row count: a developer who has
   * registered their own browser against the shared dev database would
   * otherwise fail this for having two devices.
   */
  it("includes every linked user, across transports", async () => {
    const audience = await resolveProfileAudience(profileId);
    const users = new Set(audience.map((sub) => sub.userId));

    expect(users).toContain(caregiverId);
    expect(users).toContain(professionalId);
  });

  it("excludes the user who raised the notification", async () => {
    const audience = await resolveProfileAudience(profileId, caregiverId);
    const users = new Set(audience.map((sub) => sub.userId));

    expect(users).not.toContain(caregiverId);
    expect(users).toContain(professionalId);
  });

  /**
   * The assertion that stops a future refactor from reaching for
   * Profile.caregiverId, or from dropping the ProfileAccess join entirely and
   * notifying every professional in the system.
   */
  it("never includes a user without access, however many devices they have", async () => {
    const audience = await resolveProfileAudience(profileId);

    expect(audience.map((sub) => sub.userId)).not.toContain(outsiderId);
  });

  it("returns nothing for a profile nobody is linked to", async () => {
    const audience = await resolveProfileAudience(-1);

    expect(audience).toEqual([]);
  });
});
