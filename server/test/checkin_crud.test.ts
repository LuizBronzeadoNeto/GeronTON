import { describe, it, expect, afterAll, beforeAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

let caregiverToken: string;
let professionalToken: string;
let otherCaregiverToken: string;
let profileId: number;

const PROFILE_MARKER = "TestCheckIn";
const OTHER_CAREGIVER_EMAIL = "othercheckin@test.com";

const VALID_CHECKIN = {
  skinIssues: false,
  bowelRegular: true,
  sleepWell: false,
  unstableGait: true,
  weeklyEvents: ["pain", "fever"],
  pressure: "120/80",
  saturation: "96%",
  glycemia: "110",
  appetite: "regular",
  chokingIncident: false,
  breathShortness: false,
  hydrationGoal: true,
  medsOnTime: true,
  mood: "neutral",
  stressLevel: 2,
  sunExposure: true,
  selfExpression: true,
  stimulation: false,
  dailyBath: true,
  oralHygiene: true,
  groomedNails: true,
  needsMedications: "Losartana 50mg",
};

async function login(
  email: string,
  password: string,
): Promise<request.Response> {
  return request(app).post("/login").send({ email, password });
}

beforeAll(async () => {
  const caregiverRes = await login("cuidador@demo.com", "senha123");
  caregiverToken = caregiverRes.body.token;

  const professionalRes = await login("profissional@demo.com", "senha123");
  professionalToken = professionalRes.body.token;

  await request(app)
    .post("/cuidadores")
    .set("Authorization", `Bearer ${professionalToken}`)
    .send({ email: OTHER_CAREGIVER_EMAIL, password: "pass123" });
  otherCaregiverToken = (await login(OTHER_CAREGIVER_EMAIL, "pass123")).body
    .token;

  const profileRes = await request(app)
    .post("/perfis")
    .set("Authorization", `Bearer ${caregiverToken}`)
    .send({
      firstName: PROFILE_MARKER,
      lastName: "Souza",
      birthDate: "1948-03-10",
      scholarship: "ensino médio",
    });
  profileId = profileRes.body.id;
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { firstName: PROFILE_MARKER } });
  await prisma.user.deleteMany({ where: { email: OTHER_CAREGIVER_EMAIL } });
  await prisma.$disconnect();
});

/**
 * Integration tests for the nested /perfis/:perfilId/avaliacoes weekly check-in
 * endpoints. These hit the real database.
 */
describe("/perfis/:perfilId/avaliacoes", () => {
  let checkInId: number;

  it("records a check-in on the profile", async () => {
    const res = await request(app)
      .post(`/perfis/${profileId}/avaliacoes`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send(VALID_CHECKIN);

    expect(res.status).toBe(201);
    expect(res.body.profileId).toBe(profileId);
    expect(res.body.date).toBeTruthy();
    checkInId = res.body.id;
  });

  it("rejects a check-in with a missing field, 400", async () => {
    const { groomedNails: _groomedNails, ...incomplete } = VALID_CHECKIN;
    const res = await request(app)
      .post(`/perfis/${profileId}/avaliacoes`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send(incomplete);

    expect(res.status).toBe(400);
  });

  it("rejects a check-in with a wrongly typed field, 400", async () => {
    const res = await request(app)
      .post(`/perfis/${profileId}/avaliacoes`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ ...VALID_CHECKIN, chokingIncident: "yes" });

    expect(res.status).toBe(400);
  });

  it("rejects a check-in with an unknown appetite value, 400", async () => {
    const res = await request(app)
      .post(`/perfis/${profileId}/avaliacoes`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ ...VALID_CHECKIN, appetite: "amazing" });

    expect(res.status).toBe(400);
  });

  it("rejects a check-in with stressLevel out of range, 400", async () => {
    const res = await request(app)
      .post(`/perfis/${profileId}/avaliacoes`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ ...VALID_CHECKIN, stressLevel: 9 });

    expect(res.status).toBe(400);
  });

  it("rejects a check-in with an unknown weekly event, 400", async () => {
    const res = await request(app)
      .post(`/perfis/${profileId}/avaliacoes`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ ...VALID_CHECKIN, weeklyEvents: ["alien_abduction"] });

    expect(res.status).toBe(400);
  });

  it("forbids another caregiver from recording a check-in, 403", async () => {
    const res = await request(app)
      .post(`/perfis/${profileId}/avaliacoes`)
      .set("Authorization", `Bearer ${otherCaregiverToken}`)
      .send(VALID_CHECKIN);

    expect(res.status).toBe(403);
  });

  it("lists the profile's check-in history, newest first", async () => {
    await request(app)
      .post(`/perfis/${profileId}/avaliacoes`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ ...VALID_CHECKIN, stressLevel: 1 });

    const res = await request(app)
      .get(`/perfis/${profileId}/avaliacoes`)
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body.some((c: { id: number }) => c.id === checkInId)).toBe(true);

    const dates = res.body.map((c: { date: string }) =>
      new Date(c.date).getTime(),
    );
    const sorted = [...dates].sort((a: number, b: number) => b - a);
    expect(dates).toEqual(sorted);
  });

  it("forbids another caregiver from reading the history, 403", async () => {
    const res = await request(app)
      .get(`/perfis/${profileId}/avaliacoes`)
      .set("Authorization", `Bearer ${otherCaregiverToken}`);

    expect(res.status).toBe(403);
  });

  it("lets a professional record a check-in on any profile", async () => {
    const res = await request(app)
      .post(`/perfis/${profileId}/avaliacoes`)
      .set("Authorization", `Bearer ${professionalToken}`)
      .send(VALID_CHECKIN);

    expect(res.status).toBe(201);
  });

  it("fetches one check-in by id", async () => {
    const res = await request(app)
      .get(`/perfis/${profileId}/avaliacoes/${checkInId}`)
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(checkInId);
  });

  it("returns 404 for a check-in not on the profile", async () => {
    const res = await request(app)
      .get(`/perfis/${profileId}/avaliacoes/999999`)
      .set("Authorization", `Bearer ${caregiverToken}`);

    expect(res.status).toBe(404);
  });

  it("updates a check-in", async () => {
    const res = await request(app)
      .put(`/perfis/${profileId}/avaliacoes/${checkInId}`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ stressLevel: 4 });

    expect(res.status).toBe(200);
    expect(res.body.stressLevel).toBe(4);
  });

  it("rejects an update with a wrongly typed field, 400", async () => {
    const res = await request(app)
      .put(`/perfis/${profileId}/avaliacoes/${checkInId}`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ chokingIncident: "yes" });

    expect(res.status).toBe(400);
  });

  it("returns 404 when updating a check-in not on the profile", async () => {
    const res = await request(app)
      .put(`/perfis/${profileId}/avaliacoes/999999`)
      .set("Authorization", `Bearer ${caregiverToken}`)
      .send({ stressLevel: 1 });

    expect(res.status).toBe(404);
  });

  it("forbids another caregiver from updating a check-in, 403", async () => {
    const res = await request(app)
      .put(`/perfis/${profileId}/avaliacoes/${checkInId}`)
      .set("Authorization", `Bearer ${otherCaregiverToken}`)
      .send({ stressLevel: 1 });

    expect(res.status).toBe(403);
  });

  it("forbids another caregiver from deleting a check-in, 403", async () => {
    const res = await request(app)
      .delete(`/perfis/${profileId}/avaliacoes/${checkInId}`)
      .set("Authorization", `Bearer ${otherCaregiverToken}`);

    expect(res.status).toBe(403);
  });

  it("deletes a check-in, then 404 on re-fetch", async () => {
    const del = await request(app)
      .delete(`/perfis/${profileId}/avaliacoes/${checkInId}`)
      .set("Authorization", `Bearer ${caregiverToken}`);
    expect(del.status).toBe(204);

    const res = await request(app)
      .get(`/perfis/${profileId}/avaliacoes/${checkInId}`)
      .set("Authorization", `Bearer ${caregiverToken}`);
    expect(res.status).toBe(404);
  });
});
