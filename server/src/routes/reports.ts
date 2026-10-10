import { Router, Request, Response } from "express";
import type { AlertType, Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authenticateUser.js";
import { requireRole } from "../middleware/requireRole.js";
import { localDay } from "../services/accessLog.js";

export type SignalClassification =
  | "verdadeiro_positivo"
  | "falso_positivo"
  | "falso_negativo";

export interface SignalReportRow {
  classificacao: SignalClassification;
  perfilId: number;
  tipo: string;
  gravidade: string;
  dataEvento: string;
  dataResolucao: string | null;
  responsavelId: number | null;
  descricao: string;
}

export interface SignalReportSummary {
  verdadeirosPositivos: number;
  falsosPositivos: number;
  falsosNegativos: number;
  /** Alerts still open or closed by the system, so nobody judged them. */
  semAvaliacao: number;
  /** VP / (VP + FP), null while there is nothing to divide. */
  precisao: number | null;
}

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  weakened_home_bond: "Sem check-in semanal",
  clinical_warning: "Pressão arterial",
  metabolic_decompensation: "Glicemia",
  sarcopenia_risk: "Panturrilha",
};

const SEVERITY_LABELS: Record<string, string> = {
  attention: "Atenção",
  critical: "Crítico",
};

const CSV_COLUMNS: [keyof SignalReportRow, string][] = [
  ["classificacao", "classificacao"],
  ["perfilId", "perfil_id"],
  ["tipo", "tipo"],
  ["gravidade", "gravidade"],
  ["dataEvento", "data_evento"],
  ["dataResolucao", "data_resolucao"],
  ["responsavelId", "responsavel_id"],
  ["descricao", "descricao"],
];

/**
 * Reads an optional YYYY-MM-DD query bound. With endOfDay the bound moves to
 * the last millisecond of the day, so ate=2026-10-10 still includes that day.
 * Returns undefined when absent and null when present but malformed.
 */
function parseBound(value: unknown, endOfDay = false): Date | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const time = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const date = new Date(`${value}${time}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Semicolon separated, since that is what Excel expects with a Brazilian
 * locale (the comma is the decimal separator there). Fields with a separator,
 * quote or line break get quoted.
 */
function toCsv(rows: SignalReportRow[]): string {
  const escape = (value: unknown): string => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = CSV_COLUMNS.map(([, title]) => title).join(";");
  const lines = rows.map((row) =>
    CSV_COLUMNS.map(([key]) => escape(row[key])).join(";"),
  );
  return [header, ...lines].join("\r\n") + "\r\n";
}

/**
 * Builds the validation report for the profiles a user can see: every alert
 * a professional closed with a verdict (true or false positive) plus every
 * missed signal (false negative). Alerts are filtered by creation date and
 * missed signals by the day they happened.
 */
export async function buildSignalReport(
  userId: number,
  from?: Date,
  to?: Date,
): Promise<{ summary: SignalReportSummary; rows: SignalReportRow[] }> {
  const range =
    from || to
      ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }
      : undefined;
  const linked = { access: { some: { userId } } };

  const [alerts, missed] = await Promise.all([
    prisma.alert.findMany({
      where: { profile: linked, ...(range ? { createdAt: range } : {}) },
      orderBy: { createdAt: "asc" },
    }),
    prisma.missedSignal.findMany({
      where: { profile: linked, ...(range ? { occurredAt: range } : {}) },
      orderBy: { occurredAt: "asc" },
    }),
  ]);

  const rows: SignalReportRow[] = [];
  let unjudged = 0;

  for (const alert of alerts) {
    if (alert.signalConfirmed === null) {
      unjudged += 1;
      continue;
    }
    rows.push({
      classificacao: alert.signalConfirmed
        ? "verdadeiro_positivo"
        : "falso_positivo",
      perfilId: alert.profileId,
      tipo: ALERT_TYPE_LABELS[alert.type] ?? alert.type,
      gravidade: SEVERITY_LABELS[alert.severity] ?? alert.severity,
      dataEvento: dateOnly(alert.createdAt),
      dataResolucao: alert.resolvedAt ? dateOnly(alert.resolvedAt) : null,
      responsavelId: alert.resolvedById,
      descricao: alert.message,
    });
  }

  for (const signal of missed) {
    rows.push({
      classificacao: "falso_negativo",
      perfilId: signal.profileId,
      tipo: "Não detectado",
      gravidade: SEVERITY_LABELS[signal.severity] ?? signal.severity,
      dataEvento: dateOnly(signal.occurredAt),
      dataResolucao: null,
      responsavelId: signal.reportedById,
      descricao: signal.description,
    });
  }

  const count = (kind: SignalClassification) =>
    rows.filter((row) => row.classificacao === kind).length;
  const truePositives = count("verdadeiro_positivo");
  const falsePositives = count("falso_positivo");
  const judged = truePositives + falsePositives;

  return {
    summary: {
      verdadeirosPositivos: truePositives,
      falsosPositivos: falsePositives,
      falsosNegativos: count("falso_negativo"),
      semAvaliacao: unjudged,
      precisao: judged > 0 ? truePositives / judged : null,
    },
    rows,
  };
}

/**
 * GET /relatorios/sinais
 *
 * False positive and false negative report for the professional's linked
 * profiles. Professionals only.
 *
 * The optional de and ate query params (YYYY-MM-DD) limit the period, and
 * formato=csv downloads a spreadsheet instead of the JSON summary and rows.
 * Elders show up by profile id only and staff by user id, so the file can go
 * to the research team without names or e-mails in it.
 */
export const reportsRouter = Router();

reportsRouter.get(
  "/sinais",
  authMiddleware,
  requireRole("profissional"),
  async (req: Request, res: Response) => {
    const from = parseBound(req.query.de);
    const to = parseBound(req.query.ate, true);
    if (from === null || to === null) {
      return res
        .status(400)
        .json({ error: "de and ate must be dates in YYYY-MM-DD format" });
    }

    const report = await buildSignalReport(req.user!.id, from, to);

    if (req.query.formato === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="relatorio-sinais.csv"',
      );
      // The BOM makes Excel open the file as UTF-8, otherwise accents break.
      return res.send(`\uFEFF${toCsv(report.rows)}`);
    }

    return res.json(report);
  },
);

export interface UsageMonth {
  /** YYYY-MM */
  mes: string;
  /** Days of use summed over every account (one account, one day = 1). */
  acessos: number;
  /** Distinct accounts that used the app in the month. */
  usuarios: number;
  cuidadores: number;
  profissionais: number;
}

const DEFAULT_USAGE_MONTHS = 6;
const MAX_USAGE_MONTHS = 24;

/**
 * Monthly usage for the whole app over the last `months` months, the current
 * one included, oldest first. Months without any use come back as zeros so
 * the series has no gaps.
 *
 * Accounts deleted since then still count in acessos but no longer in the
 * distinct user counts, since their rows lost the link to the account.
 */
export async function buildUsageReport(
  months: number,
  now = new Date(),
): Promise<UsageMonth[]> {
  const [year, month] = localDay(now).split("-").map(Number);
  const keys: string[] = [];
  for (let back = months - 1; back >= 0; back -= 1) {
    keys.push(
      new Date(Date.UTC(year, month - 1 - back, 1)).toISOString().slice(0, 7),
    );
  }
  const start = new Date(`${keys[0]}-01T00:00:00.000Z`);
  const end = new Date(Date.UTC(year, month, 1));

  const rows = await prisma.$queryRaw<
    { mes: string; role: Role; acessos: number; usuarios: number }[]
  >`
    SELECT to_char("day", 'YYYY-MM') AS mes,
           "role",
           COUNT(*)::int AS acessos,
           COUNT(DISTINCT "userId")::int AS usuarios
    FROM "access_logs"
    WHERE "day" >= ${start} AND "day" < ${end}
    GROUP BY 1, 2
  `;

  return keys.map((mes) => {
    const ofMonth = rows.filter((row) => row.mes === mes);
    const byRole = (role: Role) =>
      ofMonth.find((row) => row.role === role)?.usuarios ?? 0;
    return {
      mes,
      acessos: ofMonth.reduce((sum, row) => sum + row.acessos, 0),
      usuarios: ofMonth.reduce((sum, row) => sum + row.usuarios, 0),
      cuidadores: byRole("cuidador"),
      profissionais: byRole("profissional"),
    };
  });
}

/**
 * GET /relatorios/acessos
 *
 * Monthly usage of the app, for following adherence during the experiment.
 * Professionals only. Totals only, nobody is identified. Optional meses
 * (1 to 24, default 6) sets how many months back, and formato=csv downloads
 * a spreadsheet.
 */
reportsRouter.get(
  "/acessos",
  authMiddleware,
  requireRole("profissional"),
  async (req: Request, res: Response) => {
    const months =
      req.query.meses === undefined
        ? DEFAULT_USAGE_MONTHS
        : Number(req.query.meses);
    if (!Number.isInteger(months) || months < 1 || months > MAX_USAGE_MONTHS) {
      return res.status(400).json({
        error: `meses must be an integer from 1 to ${MAX_USAGE_MONTHS}`,
      });
    }

    const usage = await buildUsageReport(months);

    if (req.query.formato === "csv") {
      const lines = [
        "mes;acessos;usuarios;cuidadores;profissionais",
        ...usage.map((row) =>
          [
            row.mes,
            row.acessos,
            row.usuarios,
            row.cuidadores,
            row.profissionais,
          ].join(";"),
        ),
      ];
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="relatorio-acessos.csv"',
      );
      return res.send(`\uFEFF${lines.join("\r\n")}\r\n`);
    }

    return res.json({ meses: usage });
  },
);
