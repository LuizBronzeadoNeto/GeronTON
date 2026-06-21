import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { loadProfile } from "../middleware/loadProfile.js";

const router = Router({ mergeParams: true });

router.use(loadProfile);

const NUMBER_FIELDS = ["falls", "weightLoss"] as const;
const BOOLEAN_FIELDS = [
  "choking",
  "gaitImpairment",
  "violenceSign",
  "irregularSleep",
  "socialIsolation",
  "failedComms",
  "memoryLoss",
] as const;

/**
 * Returns the names of the weekly check-in fields that are missing or of the
 * wrong type. The numeric fields (falls, weightLoss) must be finite numbers and
 * the remaining fields must be booleans. Unlike the shared missingFields helper
 * this rejects wrong types, which matters here because `false`/`0` are valid.
 */
function invalidCheckInFields(body: Record<string, unknown>): string[] {
  const invalid: string[] = [];

  for (const field of NUMBER_FIELDS) {
    const value = body[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      invalid.push(field);
    }
  }

  for (const field of BOOLEAN_FIELDS) {
    if (typeof body[field] !== "boolean") {
      invalid.push(field);
    }
  }

  return invalid;
}

/**
 * POST /perfis/:perfilId/avaliacoes — record a weekly check-in for the profile.
 * Responds 201 with the created check-in, or 400 when a field is missing or has
 * the wrong type. `falls` is stored as an integer and `date` defaults to now().
 */
router.post("/", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const invalid = invalidCheckInFields(body);
  if (invalid.length) {
    return res
      .status(400)
      .json({ error: `missing/invalid fields: ${invalid.join(", ")}` });
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      profileId: req.profile!.id,
      falls: Math.trunc(body.falls as number),
      weightLoss: body.weightLoss as number,
      choking: body.choking as boolean,
      gaitImpairment: body.gaitImpairment as boolean,
      violenceSign: body.violenceSign as boolean,
      irregularSleep: body.irregularSleep as boolean,
      socialIsolation: body.socialIsolation as boolean,
      failedComms: body.failedComms as boolean,
      memoryLoss: body.memoryLoss as boolean,
    },
  });

  return res.status(201).json(checkIn);
});

/**
 * GET /perfis/:perfilId/avaliacoes — list the profile's weekly check-in history,
 * most recent first.
 */
router.get("/", async (req: Request, res: Response) => {
  const checkIns = await prisma.checkIn.findMany({
    where: { profileId: req.profile!.id },
    orderBy: { date: "desc" },
  });

  return res.json(checkIns);
});

/**
 * Returns the names of the check-in fields present in `body` that have the wrong
 * type. Used by the partial update: absent fields are left unchanged, but a
 * field the caller chose to send must still be a finite number / boolean, just
 * like on create.
 */
function invalidCheckInUpdates(body: Record<string, unknown>): string[] {
  const invalid: string[] = [];

  for (const field of NUMBER_FIELDS) {
    const value = body[field];
    if (
      value !== undefined &&
      (typeof value !== "number" || !Number.isFinite(value))
    ) {
      invalid.push(field);
    }
  }

  for (const field of BOOLEAN_FIELDS) {
    const value = body[field];
    if (value !== undefined && typeof value !== "boolean") {
      invalid.push(field);
    }
  }

  return invalid;
}

/**
 * GET /perfis/:perfilId/avaliacoes/:avaliacaoId — fetch one check-in.
 * 404 if it does not belong to the profile.
 */
router.get("/:avaliacaoId", async (req: Request, res: Response) => {
  const checkIn = await prisma.checkIn.findFirst({
    where: { id: Number(req.params.avaliacaoId), profileId: req.profile!.id },
  });

  if (!checkIn) {
    return res.status(404).json({ error: "check-in not found" });
  }

  return res.json(checkIn);
});

/**
 * PUT /perfis/:perfilId/avaliacoes/:avaliacaoId — update a check-in. Only fields
 * present in the body are changed, and each must keep its type (numbers finite,
 * the rest booleans), so `false`/`0` are valid. 404 if not found on the profile.
 */
router.put("/:avaliacaoId", async (req: Request, res: Response) => {
  const id = Number(req.params.avaliacaoId);
  const existing = await prisma.checkIn.findFirst({
    where: { id, profileId: req.profile!.id },
  });

  if (!existing) {
    return res.status(404).json({ error: "check-in not found" });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;

  const invalid = invalidCheckInUpdates(body);
  if (invalid.length) {
    return res
      .status(400)
      .json({ error: `invalid fields: ${invalid.join(", ")}` });
  }

  const data: Prisma.CheckInUpdateInput = {};
  if (body.falls !== undefined) data.falls = Math.trunc(body.falls as number);
  if (body.weightLoss !== undefined)
    data.weightLoss = body.weightLoss as number;
  for (const field of BOOLEAN_FIELDS) {
    if (body[field] !== undefined) {
      data[field] = body[field] as boolean;
    }
  }

  const checkIn = await prisma.checkIn.update({ where: { id }, data });
  return res.json(checkIn);
});

/**
 * DELETE /perfis/:perfilId/avaliacoes/:avaliacaoId — remove a check-in.
 * Responds 204, or 404 if not found on the profile.
 */
router.delete("/:avaliacaoId", async (req: Request, res: Response) => {
  const id = Number(req.params.avaliacaoId);
  const existing = await prisma.checkIn.findFirst({
    where: { id, profileId: req.profile!.id },
  });

  if (!existing) {
    return res.status(404).json({ error: "check-in not found" });
  }

  await prisma.checkIn.delete({ where: { id } });
  return res.status(204).send();
});

export default router;
