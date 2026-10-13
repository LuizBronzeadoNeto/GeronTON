import { Router, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authenticateUser.js";
import { loadProfile } from "../middleware/loadProfile.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router({ mergeParams: true });

const MAX_NOTE_LENGTH = 500;

router.use(loadProfile);

/**
 * Who resolved the alert. Only the id and e-mail are selected, so the rest of
 * the user row (password hash included) never ends up in a response.
 */
const RESOLVED_BY = {
  resolvedBy: { select: { id: true, email: true } },
} satisfies Prisma.AlertInclude;

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
    include: RESOLVED_BY,
  });

  return res.json(alerts);
});

/**
 * PUT /perfis/:perfilId/alertas/:alertaId
 *
 * Resolves or reopens an alert. Professionals only, since alerts drive the
 * care team's outreach.
 *
 * To resolve, send resolved true plus signalConfirmed, which says whether the
 * signal turned out to be real after the team got in touch. It is required so
 * every alert closed by a person counts in the validation report. An optional
 * note (up to 500 characters) records how the contact went. Sending resolved
 * false reopens the alert and wipes the previous answer and note. 404 if the
 * alert is not on the profile.
 */
router.put(
  "/:alertaId",
  requireRole("profissional"),
  async (req: Request, res: Response) => {
    const id = Number(req.params.alertaId);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "invalid alert id" });
    }

    const { resolved, signalConfirmed, note } = req.body ?? {};
    if (typeof resolved !== "boolean") {
      return res.status(400).json({ error: "resolved must be a boolean." });
    }
    if (resolved && typeof signalConfirmed !== "boolean") {
      return res
        .status(400)
        .json({ error: "signalConfirmed must be a boolean." });
    }
    if (
      note !== undefined &&
      (typeof note !== "string" || note.length > MAX_NOTE_LENGTH)
    ) {
      return res.status(400).json({
        error: `note must be a string of up to ${MAX_NOTE_LENGTH} characters.`,
      });
    }

    const existing = await prisma.alert.findFirst({
      where: { id, profileId: req.profile!.id },
    });
    if (!existing) {
      return res.status(404).json({ error: "alert not found" });
    }

    const alert = await prisma.alert.update({
      where: { id },
      data: resolved
        ? {
            resolvedAt: new Date(),
            resolvedById: req.user!.id,
            signalConfirmed,
            resolutionNote: note?.trim() || null,
          }
        : {
            resolvedAt: null,
            resolvedById: null,
            signalConfirmed: null,
            resolutionNote: null,
          },
      include: RESOLVED_BY,
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
  async (req: Request, res: Response) => {
    const alerts = await prisma.alert.findMany({
      where: {
        resolvedAt: null,
        profile: { access: { some: { userId: req.user!.id } } },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      include: {
        profile: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return res.json(alerts);
  },
);
