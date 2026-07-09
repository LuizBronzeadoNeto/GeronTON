import { Router, Request, Response } from "express";
import { Prisma, Appetite, Mood } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { loadProfile } from "../middleware/loadProfile.js";
import { WEEKLY_EVENTS } from "../utils/risk.js";
import {
  resolveHomeBondAlerts,
  syncCheckInAlerts,
} from "../services/alerts.js";

const router = Router({ mergeParams: true });

router.use(loadProfile);

const BOOLEAN_FIELDS = [
  "skinIssues",
  "bowelRegular",
  "sleepWell",
  "unstableGait",
  "chokingIncident",
  "breathShortness",
  "hydrationGoal",
  "medsOnTime",
  "sunExposure",
  "selfExpression",
  "stimulation",
  "dailyBath",
  "oralHygiene",
  "groomedNails",
] as const;

const OPTIONAL_STRING_FIELDS = [
  "otherEvent",
  "pressure",
  "saturation",
  "glycemia",
  "calfCircumference",
  "chokingFrequency",
  "needsMedications",
  "needsHygiene",
  "needsFood",
] as const;

const APPETITE_VALUES = Object.values(Appetite);
const MOOD_VALUES = Object.values(Mood);

/**
 * Returns the names of the weekly check-in fields that are missing or of the
 * wrong type for a create. The yes/no answers must be booleans, `appetite` and
 * `mood` must match their enums, `stressLevel` must be an integer from 0 to 5,
 * `weeklyEvents` must be an array of known event keys and the optional fields
 * must be strings when present. Unlike the shared missingFields helper this
 * rejects wrong types, which matters here because `false` is a valid answer.
 */
function invalidCheckInFields(body: Record<string, unknown>): string[] {
  const invalid: string[] = [];

  for (const field of BOOLEAN_FIELDS) {
    if (typeof body[field] !== "boolean") invalid.push(field);
  }

  if (!APPETITE_VALUES.includes(body.appetite as Appetite)) {
    invalid.push("appetite");
  }
  if (!MOOD_VALUES.includes(body.mood as Mood)) {
    invalid.push("mood");
  }

  const stress = body.stressLevel;
  if (
    typeof stress !== "number" ||
    !Number.isInteger(stress) ||
    stress < 0 ||
    stress > 5
  ) {
    invalid.push("stressLevel");
  }

  const events = body.weeklyEvents;
  if (
    !Array.isArray(events) ||
    events.some(
      (event) =>
        !WEEKLY_EVENTS.includes(event as (typeof WEEKLY_EVENTS)[number]),
    )
  ) {
    invalid.push("weeklyEvents");
  }

  for (const field of OPTIONAL_STRING_FIELDS) {
    const value = body[field];
    if (value !== undefined && value !== null && typeof value !== "string") {
      invalid.push(field);
    }
  }

  return invalid;
}

/**
 * Builds the persistable optional-string map, normalizing null to undefined so
 * Prisma stores NULL for absent values.
 */
function optionalStrings(
  body: Record<string, unknown>,
): Record<(typeof OPTIONAL_STRING_FIELDS)[number], string | null> {
  const result = {} as Record<
    (typeof OPTIONAL_STRING_FIELDS)[number],
    string | null
  >;
  for (const field of OPTIONAL_STRING_FIELDS) {
    const value = body[field];
    result[field] =
      typeof value === "string" && value.trim() !== "" ? value : null;
  }
  return result;
}

/**
 * POST /perfis/:perfilId/avaliacoes — record a weekly check-in for the profile,
 * covering the five wizard domains (health, nutrition/medication, behavior,
 * hygiene and logistics). Persists the clinical alerts derived from the vital
 * signs, and resolves any open "Vínculo Domiciliar Fragilizado" alert since a
 * new weekly report re-establishes the home bond. Responds 201 with the created
 * check-in, or 400 when a field is missing or has the wrong type. `date`
 * defaults to now().
 */
router.post("/", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const invalid = invalidCheckInFields(body);
  if (invalid.length) {
    return res
      .status(400)
      .json({ error: `missing/invalid fields: ${invalid.join(", ")}` });
  }

  const booleans = {} as Record<(typeof BOOLEAN_FIELDS)[number], boolean>;
  for (const field of BOOLEAN_FIELDS) {
    booleans[field] = body[field] as boolean;
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      profileId: req.profile!.id,
      ...booleans,
      ...optionalStrings(body),
      appetite: body.appetite as Appetite,
      mood: body.mood as Mood,
      stressLevel: body.stressLevel as number,
      weeklyEvents: (body.weeklyEvents as string[]).map(String),
    },
  });

  await syncCheckInAlerts(checkIn);
  await resolveHomeBondAlerts(checkIn.profileId);

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
 * present in the body are changed, and each must keep the type rules from
 * create, so `false`/`0` are valid. The check-in's clinical alerts are
 * regenerated from the updated vital signs. 404 if not found on the profile.
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
  const present = Object.keys(body);
  const invalid = invalidCheckInFields({ ...existing, ...body }).filter(
    (field) => present.includes(field),
  );
  if (invalid.length) {
    return res
      .status(400)
      .json({ error: `invalid fields: ${invalid.join(", ")}` });
  }

  const data: Prisma.CheckInUpdateInput = {};
  for (const field of BOOLEAN_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field] as boolean;
  }
  for (const field of OPTIONAL_STRING_FIELDS) {
    if (body[field] !== undefined) data[field] = body[field] as string | null;
  }
  if (body.appetite !== undefined) data.appetite = body.appetite as Appetite;
  if (body.mood !== undefined) data.mood = body.mood as Mood;
  if (body.stressLevel !== undefined)
    data.stressLevel = body.stressLevel as number;
  if (body.weeklyEvents !== undefined) {
    data.weeklyEvents = (body.weeklyEvents as string[]).map(String);
  }

  const checkIn = await prisma.checkIn.update({ where: { id }, data });
  await syncCheckInAlerts(checkIn);
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
