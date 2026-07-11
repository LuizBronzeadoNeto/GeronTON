import { Router, Request, Response } from "express";
import type { Profile } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authenticateUser.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  computeRiskStatus,
  evaluateCheckIn,
  type RiskLevel,
} from "../utils/risk.js";

const INTERCORRENCE_WINDOW_DAYS = 30;

/**
 * Clinical display priority of each risk level on the triage panel: critical
 * profiles first, then attention, stable and finally the ones without data.
 */
const LEVEL_PRIORITY: Record<RiskLevel, number> = {
  high: 0,
  moderate: 1,
  low: 2,
  unknown: 3,
};

interface TriageEntry extends Profile {
  risk: { status: RiskLevel; score: number; criticalEvents: string[] };
}

/**
 * Evaluates every profile in bulk: one query for the latest check-in per
 * profile (distinct on profileId after ordering by date) and one for the
 * 30-day intercorrence window, then the pure risk engine per profile.
 */
async function evaluateAllProfiles(): Promise<TriageEntry[]> {
  const profiles = await prisma.profile.findMany({ orderBy: { id: "asc" } });
  const windowStart = new Date(
    Date.now() - INTERCORRENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const [latestCheckIns, recentIntercorrences] = await Promise.all([
    prisma.checkIn.findMany({
      where: { profileId: { in: profiles.map((profile) => profile.id) } },
      orderBy: { date: "desc" },
      distinct: ["profileId"],
    }),
    prisma.intercorrence.findMany({
      where: {
        profileId: { in: profiles.map((profile) => profile.id) },
        date: { gte: windowStart },
      },
    }),
  ]);

  const checkInByProfile = new Map(
    latestCheckIns.map((checkIn) => [checkIn.profileId, checkIn]),
  );
  const intercorrencesByProfile = new Map<
    number,
    (typeof recentIntercorrences)[number][]
  >();
  for (const item of recentIntercorrences) {
    const list = intercorrencesByProfile.get(item.profileId) ?? [];
    list.push(item);
    intercorrencesByProfile.set(item.profileId, list);
  }

  return profiles.map((profile) => {
    const latestCheckIn = checkInByProfile.get(profile.id) ?? null;
    const risk = computeRiskStatus(
      latestCheckIn,
      intercorrencesByProfile.get(profile.id) ?? [],
    );
    const criticalEvents = latestCheckIn
      ? evaluateCheckIn(latestCheckIn).criticalEvents
      : [];
    return { ...profile, risk: { ...risk, criticalEvents } };
  });
}

/**
 * GET /triagem — the professional triage dashboard: every elderly profile with
 * its computed risk status, ordered by clinical priority (high, moderate, low,
 * unknown), by functional score within the same level and by id as the final
 * tiebreaker. Professional-only, since the panel spans every caregiver's
 * profiles.
 */
export const triageRouter = Router();

triageRouter.get(
  "/",
  authMiddleware,
  requireRole("profissional"),
  async (_req: Request, res: Response) => {
    const entries = await evaluateAllProfiles();

    entries.sort(
      (a, b) =>
        LEVEL_PRIORITY[a.risk.status] - LEVEL_PRIORITY[b.risk.status] ||
        b.risk.score - a.risk.score ||
        a.id - b.id,
    );

    return res.json(entries);
  },
);
