import { Router, Request, Response } from "express";
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

export default router;
