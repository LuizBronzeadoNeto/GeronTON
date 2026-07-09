import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authenticateUser.js";
import { loadProfile } from "../middleware/loadProfile.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router({ mergeParams: true });

router.use(loadProfile);

/**
 * GET /perfis/:perfilId/alertas — list the profile's alerts, newest first.
 * `?open=true` restricts the list to unresolved alerts.
 */
router.get("/", async (req: Request, res: Response) => {
  const openOnly = req.query.open === "true";

  const alerts = await prisma.alert.findMany({
    where: {
      profileId: req.profile!.id,
      ...(openOnly ? { resolvedAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(alerts);
});

/**
 * PUT /perfis/:perfilId/alertas/:alertaId — resolve (or reopen) an alert. Only
 * a healthcare professional may change it, since alerts drive the care team's
 * active-outreach workflow. Body: `{ resolved: boolean }` — true stamps
 * resolvedAt, false clears it. 404 if the alert is not on the profile.
 */
router.put(
  "/:alertaId",
  requireRole("profissional"),
  async (req: Request, res: Response) => {
    const id = Number(req.params.alertaId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "invalid alert id" });
    }

    const { resolved } = req.body ?? {};
    if (typeof resolved !== "boolean") {
      return res.status(400).json({ error: "resolved must be a boolean." });
    }

    const existing = await prisma.alert.findFirst({
      where: { id, profileId: req.profile!.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "alert not found" });
    }

    const alert = await prisma.alert.update({
      where: { id },
      data: { resolvedAt: resolved ? new Date() : null },
    });

    return res.json(alert);
  },
);

export default router;

/**
 * GET /alertas — the professional dashboard feed: every unresolved alert
 * across all profiles, critical first and newest first within each severity,
 * each carrying the profile's name for display. Professional-only.
 */
export const alertsDashboardRouter = Router();

alertsDashboardRouter.get(
  "/",
  authMiddleware,
  requireRole("profissional"),
  async (_req: Request, res: Response) => {
    const alerts = await prisma.alert.findMany({
      where: { resolvedAt: null },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      include: {
        profile: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return res.json(alerts);
  },
);
