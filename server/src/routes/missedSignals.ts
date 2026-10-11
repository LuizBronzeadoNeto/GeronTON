import { Router, Request, Response } from "express";
import { AlertSeverity } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { loadProfile } from "../middleware/loadProfile.js";
import { requireRole } from "../middleware/requireRole.js";
import { parseId } from "../utils/validation.js";

const router = Router({ mergeParams: true });

router.use(loadProfile);
router.use(requireRole("profissional"));

const SEVERITIES = Object.values(AlertSeverity);
const MAX_DESCRIPTION_LENGTH = 2000;

const REPORTED_BY = {
  reportedBy: { select: { id: true, email: true } },
} as const;

/**
 * Parses a YYYY-MM-DD date that is not in the future. Returns null for
 * anything else, so the route can answer 400.
 */
function parsePastDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) {
    return null;
  }
  return date;
}

/**
 * GET /perfis/:perfilId/sinais-nao-detectados
 *
 * The false negatives recorded for the elder, most recent first.
 * Professionals only.
 */
router.get("/", async (req: Request, res: Response) => {
  const signals = await prisma.missedSignal.findMany({
    where: { profileId: req.profile!.id },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    include: REPORTED_BY,
  });

  return res.json(signals);
});

/**
 * POST /perfis/:perfilId/sinais-nao-detectados
 *
 * Records something that happened to the elder that the system did not pick
 * up. Takes occurredAt (YYYY-MM-DD, not in the future), severity (attention or
 * critical) and a description. The professional sending the request is stored
 * as the reporter.
 */
router.post("/", async (req: Request, res: Response) => {
  const { occurredAt, severity, description } = req.body ?? {};
  const invalid: string[] = [];

  const date = parsePastDate(occurredAt);
  if (!date) invalid.push("occurredAt");
  if (!SEVERITIES.includes(severity)) invalid.push("severity");
  const text = typeof description === "string" ? description.trim() : "";
  if (text === "" || text.length > MAX_DESCRIPTION_LENGTH) {
    invalid.push("description");
  }

  if (invalid.length) {
    return res
      .status(400)
      .json({ error: `missing/invalid fields: ${invalid.join(", ")}` });
  }

  const signal = await prisma.missedSignal.create({
    data: {
      profileId: req.profile!.id,
      reportedById: req.user!.id,
      occurredAt: date!,
      severity,
      description: text,
    },
    include: REPORTED_BY,
  });

  return res.status(201).json(signal);
});

/**
 * DELETE /perfis/:perfilId/sinais-nao-detectados/:sinalId
 *
 * Removes a record, for example one entered by mistake. Only whoever recorded it may remove it, so one
 * professional can't quietly erase another's report. 204 on success.
 */
router.delete("/:sinalId", async (req: Request, res: Response) => {
  const id = parseId(req.params.sinalId);
  if (id === null) {
    return res.status(400).json({ error: "invalid id" });
  }

  const existing = await prisma.missedSignal.findFirst({
    where: { id, profileId: req.profile!.id },
  });
  if (!existing) {
    return res.status(404).json({ error: "missed signal not found" });
  }
  if (existing.reportedById !== req.user!.id) {
    return res
      .status(403)
      .json({ error: "Only the professional who recorded it can remove it." });
  }

  await prisma.missedSignal.delete({ where: { id } });
  return res.status(204).send();
});

export default router;
