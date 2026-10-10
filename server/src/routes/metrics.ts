import { Router, Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import {
  checkInsByWeek,
  signalsByMonth,
  snapshot,
  usageByMonth,
} from "../services/metrics.js";

const router = Router();

/**
 * Checks the Authorization header against METRICS_TOKEN in constant time,
 * so response timing doesn't hint at how much of a guess was right.
 */
function tokenMatches(header: string | undefined, expected: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice(7));
  const wanted = Buffer.from(expected);
  return (
    given.length === wanted.length && crypto.timingSafeEqual(given, wanted)
  );
}

/**
 * Access for the monitoring dashboard. This area doesn't use user logins:
 * Grafana sends a fixed token instead. Without METRICS_TOKEN configured the
 * whole area answers 404, so nothing is exposed by accident.
 */
function requireMetricsToken(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.METRICS_TOKEN;
  if (!expected) {
    res.status(404).json({ error: "not found" });
    return;
  }
  if (!tokenMatches(req.headers.authorization, expected)) {
    res.status(401).json({ error: "invalid metrics token" });
    return;
  }
  next();
}

router.use(requireMetricsToken);

/**
 * Reads a positive integer query param within [1, max], or the default when
 * absent. Returns null when present but invalid.
 */
function readCount(value: unknown, fallback: number, max: number) {
  if (value === undefined) return fallback;
  const count = Number(value);
  return Number.isInteger(count) && count >= 1 && count <= max ? count : null;
}

/** GET /metricas/resumo: headline numbers for the whole app, right now. */
router.get("/resumo", async (_req: Request, res: Response) => {
  res.json(await snapshot());
});

/** GET /metricas/acessos?meses=12: monthly accesses and distinct users. */
router.get("/acessos", async (req: Request, res: Response) => {
  const months = readCount(req.query.meses, 12, 24);
  if (months === null) {
    return res.status(400).json({ error: "meses must be from 1 to 24" });
  }
  return res.json(await usageByMonth(months));
});

/** GET /metricas/checkins?semanas=12: check-ins per week (from Monday). */
router.get("/checkins", async (req: Request, res: Response) => {
  const weeks = readCount(req.query.semanas, 12, 52);
  if (weeks === null) {
    return res.status(400).json({ error: "semanas must be from 1 to 52" });
  }
  return res.json(await checkInsByWeek(weeks));
});

/** GET /metricas/sinais?meses=6: signals raised, judged and missed per month. */
router.get("/sinais", async (req: Request, res: Response) => {
  const months = readCount(req.query.meses, 6, 24);
  if (months === null) {
    return res.status(400).json({ error: "meses must be from 1 to 24" });
  }
  return res.json(await signalsByMonth(months));
});

export default router;
