import { Router, Request, Response } from "express";
import { loadProfile } from "../middleware/loadProfile.js";
import { prisma } from "../lib/prisma.js";
import { computeRiskStatus, evaluateCheckIn } from "../utils/risk.js";

const router = Router({ mergeParams: true });

router.use(loadProfile);

const INTERCORRENCE_WINDOW_DAYS = 30;

/**
 * GET /perfis/:perfilId/risco — follow-up status from the latest check-in and
 * intercorrences of the last 30 days. Supports care organization, not diagnosis
 * (utils/risk.ts and docs/heuristica.md). Returns the level, weekly score,
 * critical weekly events for the dashboard and evaluation timestamp.
 */
router.get("/", async (req: Request, res: Response) => {
  const profileId = req.profile!.id;
  const windowStart = new Date(
    Date.now() - INTERCORRENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const [latestCheckIn, recentIntercorrences] = await Promise.all([
    prisma.checkIn.findFirst({
      where: { profileId },
      orderBy: { date: "desc" },
    }),
    prisma.intercorrence.findMany({
      where: { profileId, date: { gte: windowStart } },
    }),
  ]);

  const risk = computeRiskStatus(latestCheckIn, recentIntercorrences);
  const criticalEvents = latestCheckIn
    ? evaluateCheckIn(latestCheckIn).criticalEvents
    : [];

  return res.json({
    profileId,
    status: risk.status,
    score: risk.score,
    criticalEvents,
    evaluatedAt: new Date().toISOString(),
  });
});

export default router;
