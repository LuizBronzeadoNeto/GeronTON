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
import { makeCpf } from "./helpers.js";
import { checkInsByWeek, signalsByMonth } from "../src/services/metrics.js";

const TOKEN = "metricas-token-de-teste-com-tamanho-suficiente";

let profileId: number;

/**
 * Monitoring endpoints for Grafana. The series are checked against fixtures
 * dated in 2020, a period nothing else in the test database writes to, so
 * other suites running at the same time can't change the counts.
 */
beforeAll(async () => {
  const caregiver = await prisma.user.findUniqueOrThrow({
    where: { email: "cuidador@demo.com" },
  });
  const profile = await prisma.profile.create({
    data: {
      cpf: makeCpf("140000001"),
      firstName: "Metricas",
      lastName: "Teste",
      birthDate: new Date("1940-01-01"),
      scholarship: "fundamental",
      caregiverId: caregiver.id,
    },
  });
  profileId = profile.id;

  const answers = {
    skinIssues: false,
    bowelRegular: true,
    sleepWell: true,
    unstableGait: false,
    weeklyEvents: [],
    appetite: "good" as const,
    chokingIncident: false,
    breathShortness: false,
    hydrationGoal: true,
    medsOnTime: true,
    mood: "happy" as const,
    stressLevel: 0,
    sunExposure: true,
    selfExpression: true,
    stimulation: true,
  };
  // Monday 2020-03-02 and Thursday 2020-03-05 fall in the same week; the
  // second is a short check-in. 2020-03-10 is in the next week.
  for (const [date, shortForm] of [
    ["2020-03-02T15:00:00.000Z", false],
    ["2020-03-05T15:00:00.000Z", true],
    ["2020-03-10T15:00:00.000Z", false],
  ] as const) {
    await prisma.checkIn.create({
      data: { ...answers, profileId, date: new Date(date), shortForm },
    });
  }

  const base = { profileId, type: "clinical_warning" as const, message: "x" };
  await prisma.alert.createMany({
    data: [
      {
        ...base,
        severity: "attention",
        createdAt: new Date("2020-03-03T12:00:00.000Z"),
        resolvedAt: new Date("2020-03-04T12:00:00.000Z"),
        signalConfirmed: true,
      },
      {
        ...base,
        severity: "attention",
        createdAt: new Date("2020-03-06T12:00:00.000Z"),
        resolvedAt: new Date("2020-03-07T12:00:00.000Z"),
        signalConfirmed: false,
      },
      {
        ...base,
        severity: "critical",
        createdAt: new Date("2020-03-20T12:00:00.000Z"),
      },
    ],
  });
  await prisma.missedSignal.create({
    data: {
      profileId,
      occurredAt: new Date("2020-02-14T00:00:00.000Z"),
      severity: "critical",
      description: "Queda",
    },
  });
});

afterEach(() => {
  delete process.env.METRICS_TOKEN;
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: profileId ?? -1 } });
  await prisma.$disconnect();
});

function get(path: string, token?: string) {
  const req = request(app).get(`/api/metricas${path}`);
  return token ? req.set("Authorization", `Bearer ${token}`) : req;
}

describe("metrics access", () => {
  it("doesn't exist when no token is configured", async () => {
    const res = await get("/resumo", TOKEN);

    expect(res.status).toBe(404);
  });

  it("refuses a missing or wrong token", async () => {
    process.env.METRICS_TOKEN = TOKEN;

    expect((await get("/resumo")).status).toBe(401);
    expect((await get("/resumo", "outro-token")).status).toBe(401);
  });

  it("doesn't accept a user's login token", async () => {
    process.env.METRICS_TOKEN = TOKEN;
    const login = await request(app)
      .post("/login")
      .send({ email: "profissional@demo.com", password: "senha123" });

    const res = await get("/resumo", login.body.token);

    expect(res.status).toBe(401);
  });
});

describe("metrics endpoints", () => {
  it("serves the headline numbers", async () => {
    process.env.METRICS_TOKEN = TOKEN;

    const res = await get("/resumo", TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      cuidadores: expect.any(Number),
      profissionais: expect.any(Number),
      idosos: expect.any(Number),
      checkinsUltimos7Dias: expect.any(Number),
      idososComCheckinUltimos7Dias: expect.any(Number),
      sinaisAbertos: expect.any(Number),
      geradoEm: expect.any(String),
    });
    expect(res.body.idosos).toBeGreaterThanOrEqual(1);
  });

  it("serves each series with the requested length", async () => {
    process.env.METRICS_TOKEN = TOKEN;

    const [usage, checkIns, signals] = await Promise.all([
      get("/acessos?meses=3", TOKEN),
      get("/checkins?semanas=4", TOKEN),
      get("/sinais", TOKEN),
    ]);

    expect(usage.body).toHaveLength(3);
    expect(checkIns.body).toHaveLength(4);
    expect(signals.body).toHaveLength(6);
  });

  it("rejects an out of range period", async () => {
    process.env.METRICS_TOKEN = TOKEN;

    expect((await get("/acessos?meses=0", TOKEN)).status).toBe(400);
    expect((await get("/checkins?semanas=53", TOKEN)).status).toBe(400);
    expect((await get("/sinais?meses=abc", TOKEN)).status).toBe(400);
  });
});

describe("checkInsByWeek", () => {
  it("groups check-ins by week starting on Monday", async () => {
    const weeks = await checkInsByWeek(3, new Date("2020-03-12T15:00:00.000Z"));

    expect(weeks).toEqual([
      { semana: "2020-02-24", checkins: 0, idosos: 0, rapidos: 0 },
      { semana: "2020-03-02", checkins: 2, idosos: 1, rapidos: 1 },
      { semana: "2020-03-09", checkins: 1, idosos: 1, rapidos: 0 },
    ]);
  });
});

describe("signalsByMonth", () => {
  it("counts signals raised, judged and missed per month", async () => {
    const months = await signalsByMonth(
      2,
      new Date("2020-03-25T15:00:00.000Z"),
    );

    expect(months).toEqual([
      {
        mes: "2020-02",
        gerados: 0,
        abertos: 0,
        procediam: 0,
        naoProcediam: 0,
        naoDetectados: 1,
      },
      {
        mes: "2020-03",
        gerados: 3,
        abertos: 1,
        procediam: 1,
        naoProcediam: 1,
        naoDetectados: 0,
      },
    ]);
  });
});
