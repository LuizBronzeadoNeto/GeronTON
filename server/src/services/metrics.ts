import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { localDay } from "./accessLog.js";
import { ADHERENCE_WEEKS, weeklyAdherence } from "../utils/adherence.js";

/**
 * Aggregate numbers for the external monitoring dashboard (Grafana). Every
 * function here returns totals only, never anything that points at a person,
 * since the results leave the app.
 *
 * Months and weeks follow São Paulo time. Timestamps are stored in UTC, so
 * the queries convert them before grouping.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** The last `count` months as YYYY-MM, oldest first, current one included. */
function monthKeys(count: number, now: Date): string[] {
  const [year, month] = localDay(now).split("-").map(Number);
  const keys: string[] = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    keys.push(
      new Date(Date.UTC(year, month - 1 - back, 1)).toISOString().slice(0, 7),
    );
  }
  return keys;
}

/** First instant after the current month, as a UTC date. */
function nextMonthStart(now: Date): Date {
  const [year, month] = localDay(now).split("-").map(Number);
  return new Date(Date.UTC(year, month, 1));
}

/**
 * Mondays (YYYY-MM-DD) of the last `count` weeks, oldest first, the current
 * week included.
 */
function weekKeys(count: number, now: Date): string[] {
  const today = new Date(`${localDay(now)}T00:00:00.000Z`);
  const sinceMonday = (today.getUTCDay() + 6) % 7;
  const monday = today.getTime() - sinceMonday * DAY_MS;
  const keys: string[] = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    keys.push(new Date(monday - back * 7 * DAY_MS).toISOString().slice(0, 10));
  }
  return keys;
}

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

/**
 * Monthly app usage from access_logs, oldest month first, with empty months
 * as zeros. Accounts deleted since then still count in acessos but no longer
 * in the distinct user counts, since their rows lost the link to the account.
 */
export async function usageByMonth(
  months: number,
  now = new Date(),
): Promise<UsageMonth[]> {
  const keys = monthKeys(months, now);
  const rows = await prisma.$queryRaw<
    { mes: string; role: Role; acessos: number; usuarios: number }[]
  >`
    SELECT to_char("day", 'YYYY-MM') AS mes,
           "role",
           COUNT(*)::int AS acessos,
           COUNT(DISTINCT "userId")::int AS usuarios
    FROM "access_logs"
    WHERE "day" >= ${new Date(`${keys[0]}-01T00:00:00.000Z`)}
      AND "day" < ${nextMonthStart(now)}
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

export interface CheckInWeek {
  /** Monday of the week, YYYY-MM-DD. */
  semana: string;
  checkins: number;
  /** Distinct elders with at least one check-in that week. */
  idosos: number;
  /** How many of the check-ins used the short version. */
  rapidos: number;
}

/** Weekly check-ins, oldest week first, with empty weeks as zeros. */
export async function checkInsByWeek(
  weeks: number,
  now = new Date(),
): Promise<CheckInWeek[]> {
  const keys = weekKeys(weeks, now);
  // Bounds in São Paulo time: 03:00 UTC is local midnight (no DST since 2019).
  const from = new Date(`${keys[0]}T03:00:00.000Z`);
  const rows = await prisma.$queryRaw<
    { semana: string; checkins: number; idosos: number; rapidos: number }[]
  >`
    SELECT to_char(
             date_trunc('week', ("date" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo'),
             'YYYY-MM-DD'
           ) AS semana,
           COUNT(*)::int AS checkins,
           COUNT(DISTINCT "profileId")::int AS idosos,
           COUNT(*) FILTER (WHERE "shortForm")::int AS rapidos
    FROM "check_ins"
    WHERE "date" >= ${from}
    GROUP BY 1
  `;

  return keys.map((semana) => {
    const row = rows.find((item) => item.semana === semana);
    return {
      semana,
      checkins: row?.checkins ?? 0,
      idosos: row?.idosos ?? 0,
      rapidos: row?.rapidos ?? 0,
    };
  });
}

export interface SignalMonth {
  /** YYYY-MM */
  mes: string;
  /** Alerts raised in the month. */
  gerados: number;
  /** Of those, how many are still open. */
  abertos: number;
  procediam: number;
  naoProcediam: number;
  /** Missed signals whose event happened in the month. */
  naoDetectados: number;
}

/** Signals per month, oldest first, with empty months as zeros. */
export async function signalsByMonth(
  months: number,
  now = new Date(),
): Promise<SignalMonth[]> {
  const keys = monthKeys(months, now);
  const from = new Date(`${keys[0]}-01T03:00:00.000Z`);

  const [alerts, missed] = await Promise.all([
    prisma.$queryRaw<
      {
        mes: string;
        gerados: number;
        abertos: number;
        procediam: number;
        naoprocediam: number;
      }[]
    >`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS mes,
             COUNT(*)::int AS gerados,
             COUNT(*) FILTER (WHERE "resolvedAt" IS NULL)::int AS abertos,
             COUNT(*) FILTER (WHERE "signalConfirmed" = true)::int AS procediam,
             COUNT(*) FILTER (WHERE "signalConfirmed" = false)::int AS naoprocediam
      FROM "alerts"
      WHERE "createdAt" >= ${from}
      GROUP BY 1
    `,
    prisma.$queryRaw<{ mes: string; total: number }[]>`
      SELECT to_char("occurredAt", 'YYYY-MM') AS mes, COUNT(*)::int AS total
      FROM "missed_signals"
      WHERE "occurredAt" >= ${new Date(`${keys[0]}-01T00:00:00.000Z`)}
      GROUP BY 1
    `,
  ]);

  return keys.map((mes) => {
    const row = alerts.find((item) => item.mes === mes);
    return {
      mes,
      gerados: row?.gerados ?? 0,
      abertos: row?.abertos ?? 0,
      procediam: row?.procediam ?? 0,
      naoProcediam: row?.naoprocediam ?? 0,
      naoDetectados: missed.find((item) => item.mes === mes)?.total ?? 0,
    };
  });
}

export interface Snapshot {
  cuidadores: number;
  profissionais: number;
  idosos: number;
  checkinsUltimos7Dias: number;
  idososComCheckinUltimos7Dias: number;
  sinaisAbertos: number;
  /** Mean share of the last 8 weeks with a check-in, from 0 to 1. Null with no elders. */
  adesaoMedia: number | null;
  geradoEm: string;
}

/** Current state of the whole app, for the dashboard's headline numbers. */
export async function snapshot(now = new Date()): Promise<Snapshot> {
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const windowStart = new Date(now.getTime() - ADHERENCE_WEEKS * 7 * DAY_MS);

  const [roles, profiles, recent, openSignals, windowCheckIns] =
    await Promise.all([
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.profile.findMany({ select: { id: true, createdAt: true } }),
      prisma.checkIn.findMany({
        where: { date: { gte: weekAgo } },
        select: { profileId: true },
      }),
      prisma.alert.count({ where: { resolvedAt: null } }),
      prisma.checkIn.findMany({
        where: { date: { gte: windowStart } },
        select: { profileId: true, date: true },
      }),
    ]);

  const datesByProfile = new Map<number, Date[]>();
  for (const { profileId, date } of windowCheckIns) {
    const dates = datesByProfile.get(profileId) ?? [];
    dates.push(date);
    datesByProfile.set(profileId, dates);
  }
  const rates = profiles.map((profile) => {
    const adherence = weeklyAdherence(
      profile.createdAt,
      datesByProfile.get(profile.id) ?? [],
      now,
    );
    return adherence.weeksWithCheckIn / adherence.weeksObserved;
  });

  const countRole = (role: Role) =>
    roles.find((row) => row.role === role)?._count._all ?? 0;

  return {
    cuidadores: countRole("cuidador"),
    profissionais: countRole("profissional"),
    idosos: profiles.length,
    checkinsUltimos7Dias: recent.length,
    idososComCheckinUltimos7Dias: new Set(recent.map((row) => row.profileId))
      .size,
    sinaisAbertos: openSignals,
    adesaoMedia: rates.length
      ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length
      : null,
    geradoEm: now.toISOString(),
  };
}
