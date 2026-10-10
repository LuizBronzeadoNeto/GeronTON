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

export interface Retention {
  /** People in the group old enough to have had a 4th week. */
  coorte: number;
  /** Of those, how many were active in their 4th week (days 21 to 27). */
  retidos: number;
  /** retidos / coorte, null while the group is empty. */
  taxa: number | null;
}

function retention(coorte: number, retidos: number): Retention {
  return { coorte, retidos, taxa: coorte > 0 ? retidos / coorte : null };
}

/**
 * 4-week retention of accounts: of the accounts whose first day of use was at
 * least 28 days ago, the share that used the app again between day 21 and 27
 * after it. Uses access_logs, so it only has data from when that table
 * started filling.
 */
export async function userRetention(now = new Date()): Promise<Retention> {
  const today = localDay(now);
  const [row] = await prisma.$queryRaw<{ coorte: number; retidos: number }[]>`
    WITH first_day AS (
      SELECT "userId", MIN("day") AS d0
      FROM "access_logs"
      WHERE "userId" IS NOT NULL
      GROUP BY 1
    )
    SELECT COUNT(*)::int AS coorte,
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM "access_logs" a
             WHERE a."userId" = f."userId"
               AND a."day" >= f.d0 + 21
               AND a."day" < f.d0 + 28
           ))::int AS retidos
    FROM first_day f
    WHERE f.d0 <= ${today}::date - 28
  `;
  return retention(row.coorte, row.retidos);
}

/**
 * 4-week retention of elders, from check-ins: of the elders registered at
 * least 28 days ago, the share with a check-in between day 21 and 27 after
 * registration. Works on the whole history, not only since access_logs.
 */
export async function elderRetention(now = new Date()): Promise<Retention> {
  const cutoff = new Date(now.getTime() - 28 * DAY_MS);
  const [row] = await prisma.$queryRaw<{ coorte: number; retidos: number }[]>`
    SELECT COUNT(*)::int AS coorte,
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM "check_ins" c
             WHERE c."profileId" = p."id"
               AND c."date" >= p."createdAt" + interval '21 days'
               AND c."date" < p."createdAt" + interval '28 days'
           ))::int AS retidos
    FROM "profiles" p
    WHERE p."createdAt" <= ${cutoff}
  `;
  return retention(row.coorte, row.retidos);
}

export interface Activation {
  /** Caregivers linked to an elder that already got at least one check-in. */
  cuidadores: number;
  /** Professionals linked to at least one elder. */
  profissionais: number;
  /** Activated accounts over all accounts, null with no accounts. */
  taxa: number | null;
}

export interface Snapshot {
  cuidadores: number;
  profissionais: number;
  usuariosCadastrados: number;
  /** Distinct accounts that used the app in the last 7 and 30 days. */
  ativos7Dias: number;
  ativos30Dias: number;
  ativacao: Activation;
  retencao4Semanas: Retention;
  retencaoIdosos4Semanas: Retention;
  idosos: number;
  checkinsUltimos7Dias: number;
  idososComCheckinUltimos7Dias: number;
  sinaisAbertos: number;
  /** Signals that held up over all signals judged, null while none was judged. */
  precisaoSinais: number | null;
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
  const registered = countRole("cuidador") + countRole("profissional");

  const daysBack = (days: number) =>
    new Date(
      `${localDay(new Date(now.getTime() - days * DAY_MS))}T00:00:00.000Z`,
    );

  const [
    active7,
    active30,
    activeCaregivers,
    activeProfessionals,
    judged,
    confirmed,
    usersKept,
    eldersKept,
  ] = await Promise.all([
    prisma.accessLog.findMany({
      where: { day: { gte: daysBack(6) }, userId: { not: null } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.accessLog.findMany({
      where: { day: { gte: daysBack(29) }, userId: { not: null } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.user.count({
      where: {
        role: "cuidador",
        access: { some: { profile: { checkIns: { some: {} } } } },
      },
    }),
    prisma.user.count({
      where: { role: "profissional", access: { some: {} } },
    }),
    prisma.alert.count({ where: { signalConfirmed: { not: null } } }),
    prisma.alert.count({ where: { signalConfirmed: true } }),
    userRetention(now),
    elderRetention(now),
  ]);

  return {
    cuidadores: countRole("cuidador"),
    profissionais: countRole("profissional"),
    usuariosCadastrados: registered,
    ativos7Dias: active7.length,
    ativos30Dias: active30.length,
    ativacao: {
      cuidadores: activeCaregivers,
      profissionais: activeProfessionals,
      taxa:
        registered > 0
          ? (activeCaregivers + activeProfessionals) / registered
          : null,
    },
    retencao4Semanas: usersKept,
    retencaoIdosos4Semanas: eldersKept,
    precisaoSinais: judged > 0 ? confirmed / judged : null,
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
