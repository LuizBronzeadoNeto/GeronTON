import { Router, Request, Response } from "express";
import { EventType } from "@prisma/client";
import { loadProfile } from "../middleware/loadProfile.js";
import { prisma } from "../lib/prisma.js";
import { dispatchProfileNotification } from "../services/push.js";
import { eventTypeLabel } from "../utils/labels.js";
import { CRITICAL_EVENT_TYPES } from "../utils/risk.js";

const router = Router({ mergeParams: true });

router.use(loadProfile);

const EVENT_TYPES = Object.values(EventType);

/**
 * POST /perfis/:perfilId/intercorrencias — record an adverse event for the
 * profile. `eventType` must be one of the EventType enum values and
 * `isCritical` a boolean; `description` is optional and defaults to an empty
 * string. Responds 201 with the created intercorrence.
 */
router.post("/", async (req: Request, res: Response) => {
  const { eventType, isCritical, description } = req.body ?? {};

  if (!EVENT_TYPES.includes(eventType)) {
    return res.status(400).json({
      error: `Invalid event type '${eventType}', must be one of: ${EVENT_TYPES.join(", ")}`,
    });
  }
  if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({ error: "description must be a string." });
  }
  if (typeof isCritical !== "boolean") {
    return res.status(400).json({ error: "isCritical must be a boolean." });
  }

  const intercorrence = await prisma.intercorrence.create({
    data: {
      profileId: req.profile!.id,
      eventType,
      isCritical,
      description: description?.trim() ?? "",
    },
  });

  notifyCriticalEvent(req, intercorrence);

  return res.status(201).json(intercorrence);
});

/**
 * Alerts the rest of the care team about a critical intercorrence.
 *
 * Criticality follows the definition the risk engine already uses
 * (utils/risk.ts): the caregiver's own flag, or an event type that is critical
 * whatever they selected. So a bleed recorded without ticking "crítica" still
 * reaches the team, which is the case worth getting right.
 *
 * Fire-and-forget by construction: the caregiver's 201 must not wait on a push
 * service, and a push outage must never turn a recorded intercorrence into an
 * error. The author is excluded because they are about to see the confirmation
 * screen. The description is deliberately left out of the body — it is the most
 * sensitive field in the system and would otherwise land on a lock screen.
 */
function notifyCriticalEvent(
  req: Request,
  intercorrence: { id: number; eventType: EventType; isCritical: boolean },
): void {
  const isCriticalEvent =
    intercorrence.isCritical ||
    CRITICAL_EVENT_TYPES.has(intercorrence.eventType);

  if (!isCriticalEvent) {
    return;
  }

  const profile = req.profile!;

  dispatchProfileNotification(
    profile.id,
    {
      title: "Intercorrência crítica",
      body: `${profile.firstName} ${profile.lastName}: ${eventTypeLabel(intercorrence.eventType)}`,
      data: {
        kind: "intercorrence",
        profileId: String(profile.id),
        intercorrenceId: String(intercorrence.id),
      },
      critical: true,
    },
    { excludeUserId: req.user!.id },
  );
}

/**
 * GET /perfis/:perfilId/intercorrencias — list the profile's intercorrences,
 * most recent first.
 */
router.get("/", async (req: Request, res: Response) => {
  const intercorrences = await prisma.intercorrence.findMany({
    where: { profileId: req.profile!.id },
    orderBy: { date: "desc" },
  });

  return res.json(intercorrences);
});

/**
 * GET /perfis/:perfilId/intercorrencias/:id — fetch one intercorrence.
 * 404 if it does not belong to the profile.
 */
router.get("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid id." });
  }

  const intercorrence = await prisma.intercorrence.findFirst({
    where: { id, profileId: req.profile!.id },
  });

  if (!intercorrence) {
    return res.status(404).json({ error: "Intercorrence not found." });
  }

  return res.json(intercorrence);
});

/**
 * DELETE /perfis/:perfilId/intercorrencias/:id — remove an intercorrence.
 * Responds 204, or 404 if not found on the profile.
 */
router.delete("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "Invalid id." });
  }

  const existing = await prisma.intercorrence.findFirst({
    where: { id, profileId: req.profile!.id },
  });

  if (!existing) {
    return res.status(404).json({ error: "Intercorrence not found." });
  }

  await prisma.intercorrence.delete({ where: { id } });

  return res.status(204).send();
});

export default router;
