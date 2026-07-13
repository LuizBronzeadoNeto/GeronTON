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
import { prisma } from "../src/lib/prisma.js";
import { detectCheckInOmissions } from "../src/services/alerts.js";

let caregiverToken: string;
let professionalToken: string;
let perfilId: number;

const CLEAN_CHECKIN = {
  skinIssues: false,
  bowelRegular: true,
  sleepWell: true,
  unstableGait: false,
  weeklyEvents: [] as string[],
  appetite: "good",
  chokingIncident: false,
  breathShortness: false,
  hydrationGoal: true,
  medsOnTime: true,
  mood: "happy",
  stressLevel: 0,
  sunExposure: true,
  selfExpression: true,
  stimulation: true,
  dailyBath: true,
  oralHygiene: true,
  groomedNails: true,
};

/**
 * Alert integration tests: vital-sign alerts synced from check-ins, the
 * weekly-omission monitor and the alert routes. A dedicated profile keeps the
 * shared dev database's other data out of the assertions; deleting it in
 * afterAll cascades over its check-ins and alerts.
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
      firstName: "Alerta",
      lastName: "Teste",
      birthDate: "1938-02-10",
      scholarship: "fundamental",
    });
  expect(profileRes.status).toBe(201);
  perfilId = profileRes.body.id;
});

afterEach(async () => {
  await prisma.alert.deleteMany({ where: { profileId: perfilId } });
  await prisma.checkIn.deleteMany({ where: { profileId: perfilId } });
  await prisma.profile.update({
    where: { id: perfilId },
    data: { createdAt: new Date() },
  });
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: perfilId } });
});

async function createCheckIn(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post(`/perfis/${perfilId}/avaliacoes`)
    .set("Authorization", `Bearer ${caregiverToken}`)
    .send({ ...CLEAN_CHECKIN, ...overrides });
  expect(res.status).toBe(201);
  return res.body;
}

async function listAlerts(query = "") {
  return request(app)
    .get(`/perfis/${perfilId}/alertas${query}`)
    .set("Authorization", `Bearer ${caregiverToken}`);
}

/**
 * Ages the profile so it looks 5 weeks old with no check-ins, which is the
 * omission scenario the background monitor must flag.
 */
async function ageProfile() {
  await prisma.profile.update({
    where: { id: perfilId },
    data: { createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) },
  });
}

describe("check-in vital-sign alerts", () => {
  it("persists clinical alerts for outlier vital signs", async () => {
    await createCheckIn({
      pressure: "150/95",
      glycemia: "250",
      calfCircumference: "29",
    });

    const res = await listAlerts();

    expect(res.status).toBe(200);
    const types = res.body.map((alert: { type: string }) => alert.type).sort();
    expect(types).toEqual([
      "clinical_warning",
      "metabolic_decompensation",
      "sarcopenia_risk",
    ]);
    for (const alert of res.body) {
      expect(alert.severity).toBe("attention");
      expect(alert.resolvedAt).toBeNull();
    }
  });

  it("creates no alerts for vital signs within clinical parameters", async () => {
    await createCheckIn({
      pressure: "120/80",
      glycemia: "98",
      saturation: "97",
      calfCircumference: "34",
    });

    const res = await listAlerts();

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("replaces a check-in's alerts when it is updated", async () => {
    const checkIn = await createCheckIn({ pressure: "85/55" });

    const updateRes = await request(app)
      .put(`/perfis/${perfilId}/avaliacoes/${checkIn.id}`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ pressure: "120/80" });
    expect(updateRes.status).toBe(200);

    const res = await listAlerts();
    expect(res.body).toEqual([]);
  });

  it("removes a check-in's alerts when it is deleted", async () => {
    const checkIn = await createCheckIn({ glycemia: "300" });

    const deleteRes = await request(app)
      .delete(`/perfis/${perfilId}/avaliacoes/${checkIn.id}`)
      .set("Authorization", `Bearer ${caregiverToken}`);
    expect(deleteRes.status).toBe(204);

    const res = await listAlerts();
    expect(res.body).toEqual([]);
  });
});

describe("weekly omission monitor", () => {
  it("raises the weakened-home-bond alert after 4 weeks without check-ins", async () => {
    await ageProfile();

    await detectCheckInOmissions();

    const res = await listAlerts();
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("weakened_home_bond");
    expect(res.body[0].severity).toBe("attention");
    expect(res.body[0].message).toContain("Vínculo Domiciliar Fragilizado");
  });

  it("does not duplicate an open weakened-home-bond alert", async () => {
    await ageProfile();

    await detectCheckInOmissions();
    await detectCheckInOmissions();

    const res = await listAlerts();
    expect(res.body).toHaveLength(1);
  });

  it("does not flag a profile with a recent check-in", async () => {
    await ageProfile();
    await createCheckIn();

    await detectCheckInOmissions();

    const res = await listAlerts();
    expect(res.body).toEqual([]);
  });

  it("flags a profile whose last check-in is older than 4 weeks", async () => {
    await ageProfile();
    const checkIn = await createCheckIn();
    await prisma.checkIn.update({
      where: { id: checkIn.id },
      data: { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    await detectCheckInOmissions();

    const res = await listAlerts();
    expect(res.body).toHaveLength(1);
    expect(res.body[0].type).toBe("weakened_home_bond");
  });

  it("resolves the open bond alert when a new check-in arrives", async () => {
    await ageProfile();
    await detectCheckInOmissions();

    await createCheckIn();

    const open = await listAlerts("?open=true");
    expect(open.body).toEqual([]);

    const all = await listAlerts();
    expect(all.body).toHaveLength(1);
    expect(all.body[0].resolvedAt).not.toBeNull();
  });
});

describe("alert routes", () => {
  it("lets a professional resolve and reopen an alert", async () => {
    await ageProfile();
    await detectCheckInOmissions();
    const listed = await listAlerts();
    const alertId = listed.body[0].id;

    const resolveRes = await request(app)
      .put(`/perfis/${perfilId}/alertas/${alertId}`)
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ resolved: true });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.resolvedAt).not.toBeNull();

    const reopenRes = await request(app)
      .put(`/perfis/${perfilId}/alertas/${alertId}`)
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ resolved: false });
    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.resolvedAt).toBeNull();
  });

  it("forbids a caregiver from resolving alerts", async () => {
    await ageProfile();
    await detectCheckInOmissions();
    const listed = await listAlerts();
    const alertId = listed.body[0].id;

    const res = await request(app)
      .put(`/perfis/${perfilId}/alertas/${alertId}`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ resolved: true });

    expect(res.status).toBe(403);
  });

  it("returns 404 when resolving an alert from another profile", async () => {
    await ageProfile();
    await detectCheckInOmissions();
    const listed = await listAlerts();
    const alertId = listed.body[0].id;

    const otherProfileRes = await request(app)
      .post("/perfis")
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({
        firstName: "Outro",
        lastName: "Perfil",
        birthDate: "1941-01-01",
        scholarship: "fundamental",
      });
    expect(otherProfileRes.status).toBe(201);
    const otherId = otherProfileRes.body.id;

    const res = await request(app)
      .put(`/perfis/${otherId}/alertas/${alertId}`)
      .set("Authorization", `Bearer ${professionalToken}`)
      .send({ resolved: true });
    expect(res.status).toBe(404);

    await prisma.profile.delete({ where: { id: otherId } });
  });

  it("serves the professional dashboard feed with profile names", async () => {
    await ageProfile();
    await detectCheckInOmissions();

    const res = await request(app)
      .get("/alertas")
      .set("Authorization", `Bearer ${professionalToken}`);

    expect(res.status).toBe(200);
    const mine = res.body.filter(
      (alert: { profileId: number }) => alert.profileId === perfilId,
    );
    expect(mine).toHaveLength(1);
    expect(mine[0].profile).toMatchObject({
      id: perfilId,
      firstName: "Alerta",
      lastName: "Teste",
    });
    expect(mine[0].resolvedAt).toBeNull();
  });

  it("forbids caregivers from the dashboard feed", async () => {
    const res = await request(app)
      .get("/alertas")
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(res.status).toBe(403);
  });

  it("rejects unauthenticated alert requests", async () => {
    const res = await request(app).get(`/perfis/${perfilId}/alertas`);
    expect(res.status).toBe(401);
  });
});
