import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { grantProfileAccess, makeCpf, signUpProfessional } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";

const PRO_EMAIL = "relatorio.pro@test.com";

let caregiverToken: string;
let proToken: string;
let perfilId: number;

/**
 * Validation report (SCRUM-17). Uses its own professional, linked only to
 * this suite's profile, so the counts aren't affected by other suites running
 * against the same database. Alerts are inserted directly to keep the setup
 * short.
 */
beforeAll(async () => {
  caregiverToken = (
    await request(app)
      .post("/login")
      .send({ email: "cuidador@demo.com", password: "senha123" })
  ).body.token;
  proToken = await signUpProfessional(PRO_EMAIL, "77002-PB");
  const pro = await prisma.user.findUniqueOrThrow({
    where: { email: PRO_EMAIL },
  });

  const profileRes = await request(app)
    .post("/perfis")
    .set("Authorization", `Bearer ${caregiverToken}`)
    .send({
      cpf: makeCpf("120000002"),
      firstName: "Relatorio",
      lastName: "Teste",
      birthDate: "1939-07-01",
      scholarship: "fundamental",
    });
  expect(profileRes.status).toBe(201);
  perfilId = profileRes.body.id;
  await grantProfileAccess(perfilId, PRO_EMAIL);

  const resolved = {
    resolvedAt: new Date("2026-09-12T10:00:00Z"),
    resolvedById: pro.id,
  };
  await prisma.alert.createMany({
    data: [
      {
        profileId: perfilId,
        type: "metabolic_decompensation",
        severity: "attention",
        message: "Glicemia 260, acima de 200 mg/dL",
        createdAt: new Date("2026-09-10T10:00:00Z"),
        signalConfirmed: true,
        ...resolved,
      },
      {
        profileId: perfilId,
        type: "clinical_warning",
        severity: "attention",
        message: "Pressão arterial 150/95; medida logo após o almoço",
        createdAt: new Date("2026-09-11T10:00:00Z"),
        signalConfirmed: false,
        ...resolved,
      },
      {
        profileId: perfilId,
        type: "sarcopenia_risk",
        severity: "attention",
        message: "ainda aberto",
        createdAt: new Date("2026-09-11T11:00:00Z"),
      },
    ],
  });
  await prisma.missedSignal.create({
    data: {
      profileId: perfilId,
      reportedById: pro.id,
      occurredAt: new Date("2026-09-20T00:00:00Z"),
      severity: "critical",
      description: "Queda com fratura",
    },
  });
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: perfilId ?? -1 } });
  await prisma.user.deleteMany({ where: { email: PRO_EMAIL } });
  await prisma.$disconnect();
});

function getReport(query = "", token = proToken) {
  return request(app)
    .get(`/relatorios/sinais${query}`)
    .set("Authorization", `Bearer ${token}`);
}

describe("GET /relatorios/sinais", () => {
  it("counts true positives, false positives and false negatives", async () => {
    const res = await getReport();

    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({
      verdadeirosPositivos: 1,
      falsosPositivos: 1,
      falsosNegativos: 1,
      semAvaliacao: 1,
      precisao: 0.5,
    });
    const kinds = res.body.rows.map(
      (row: { classificacao: string }) => row.classificacao,
    );
    expect(kinds).toEqual([
      "verdadeiro_positivo",
      "falso_positivo",
      "falso_negativo",
    ]);
    expect(res.body.rows[0]).toMatchObject({
      perfilId,
      tipo: "Glicemia",
      gravidade: "Atenção",
      dataEvento: "2026-09-10",
      dataResolucao: "2026-09-12",
    });
  });

  it("limits the period with de and ate", async () => {
    const res = await getReport("?de=2026-09-11&ate=2026-09-11");

    expect(res.status).toBe(200);
    expect(res.body.summary.falsosPositivos).toBe(1);
    expect(res.body.summary.verdadeirosPositivos).toBe(0);
    expect(res.body.summary.falsosNegativos).toBe(0);
  });

  it("rejects malformed dates", async () => {
    const res = await getReport("?de=11/09/2026");

    expect(res.status).toBe(400);
  });

  it("downloads a CSV with names and e-mails left out", async () => {
    const res = await getReport("?formato=csv");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    const lines = res.text
      .replace(/^\uFEFF/, "")
      .trim()
      .split("\r\n");
    expect(lines[0]).toBe(
      "classificacao;perfil_id;tipo;gravidade;data_evento;data_resolucao;responsavel_id;descricao",
    );
    expect(lines).toHaveLength(4);
    expect(lines[2]).toContain(
      '"Pressão arterial 150/95; medida logo após o almoço"',
    );
    expect(res.text).not.toContain("Relatorio");
    expect(res.text).not.toContain(PRO_EMAIL);
  });

  it("is off limits to caregivers", async () => {
    const res = await getReport("", caregiverToken);

    expect(res.status).toBe(403);
  });
});
