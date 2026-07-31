import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

/**
 * GET /health — liveness and readiness probe used by the container healthcheck
 * and the reverse proxy.
 *
 * Issues a trivial query so the check fails when the database is unreachable
 * rather than only when the process is dead. Responds 200 `{ status: "ok" }`
 * when the database answers and 503 `{ status: "degraded" }` when it does not.
 * The failure is swallowed on purpose: an unreachable database is an expected
 * state for a probe, not an unhandled error worth a 500.
 *
 * Unauthenticated and deliberately exempt from rate limiting, so an orchestrator
 * polling it every few seconds can never exhaust the request budget.
 */
router.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: "ok" });
  } catch {
    return res.status(503).json({ status: "degraded" });
  }
});

export default router;
