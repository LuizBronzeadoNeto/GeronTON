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
import {
  ADHERENCE_WEEKS,
  weeklyAdherence,
  type WeeklyAdherence,
} from "../utils/adherence.js";

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
  adherence: WeeklyAdherence;
}

/**
 * Evaluates the profiles the given user is linked to, in bulk: one query for
 * the latest check-in per profile (distinct on profileId after ordering by
 * date), one for the 30-day intercorrence window and one for the check-in
 * dates of the last 8 weeks (for adherence), then the pure risk engine per
 * profile.
 */
async function evaluateLinkedProfiles(userId: number): Promise<TriageEntry[]> {
  const profiles = await prisma.profile.findMany({
    where: { access: { some: { userId } } },
    orderBy: { id: "asc" },
  });
  const windowStart = new Date(
    Date.now() - INTERCORRENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const adherenceStart = new Date(
    Date.now() - ADHERENCE_WEEKS * 7 * 24 * 60 * 60 * 1000,
  );

  const [latestCheckIns, recentIntercorrences, windowCheckIns] =
    await Promise.all([
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
      prisma.checkIn.findMany({
        where: {
          profileId: { in: profiles.map((profile) => profile.id) },
          date: { gte: adherenceStart },
        },
        select: { profileId: true, date: true },
      }),
    ]);

  const checkInDatesByProfile = new Map<number, Date[]>();
  for (const { profileId, date } of windowCheckIns) {
    const dates = checkInDatesByProfile.get(profileId) ?? [];
    dates.push(date);
    checkInDatesByProfile.set(profileId, dates);
  }

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
    const adherence = weeklyAdherence(
      profile.createdAt,
      checkInDatesByProfile.get(profile.id) ?? [],
    );
    return { ...profile, risk: { ...risk, criticalEvents }, adherence };
  });
}

/**
 * GET /triagem — the professional triage dashboard: the elderly profiles the
 * requesting professional is linked to, each with its computed risk status,
 * ordered by clinical priority (high, moderate, low, unknown), by functional
 * score within the same level and by id as the final tiebreaker. Each entry
 * also carries its weekly check-in adherence over the last 8 weeks.
 *
 * The panel spans several caregivers' profiles, but only those the professional
 * has been granted access to — it is no longer a view of the whole system.
 */
export const triageRouter = Router();

triageRouter.get(
  "/",
  authMiddleware,
  requireRole("profissional"),
  async (req: Request, res: Response) => {
    const entries = await evaluateLinkedProfiles(req.user!.id);

    entries.sort(
      (a, b) =>
        LEVEL_PRIORITY[a.risk.status] - LEVEL_PRIORITY[b.risk.status] ||
        b.risk.score - a.risk.score ||
        a.id - b.id,
    );

    return res.json(entries);
  },
);
