import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authenticateUser.js";
import { loadProfile } from "../middleware/loadProfile.js";
import { missingFields, optionalText } from "../utils/validation.js";
import { isValidCpf, normalizeCpf } from "../utils/cpf.js";
import medicationsRouter from "./medications.js";
import routinesRouter from "./routines.js";
import checkinsRouter from "./checkins.js";
import intercorrencesRouter from "../routes/intercorrences.js";
import riskRouter from "./risk.js";
import alertsRouter from "./alerts.js";

const router = Router();

router.use(authMiddleware);

router.use("/:perfilId/medicamentos", medicationsRouter);
router.use("/:perfilId/rotinas", routinesRouter);
router.use("/:perfilId/avaliacoes", checkinsRouter);
router.use("/:perfilId/intercorrencias", intercorrencesRouter);
router.use("/:perfilId/risco", riskRouter);
router.use("/:perfilId/alertas", alertsRouter);

/**
 * POST /perfis — create an elderly profile.
 *
 * The CPF is required and identifies the elder across the whole system, so a
 * duplicate is answered 409 rather than creating a second record for the same
 * person: the caller should have gone through POST /perfis/verificar and bound
 * to the existing elder instead.
 *
 * A cuidador becomes the owner; a profissional may assign the profile to a
 * caregiver via `caregiverId` in the body, otherwise becomes the owner. The
 * profile and its access rows are written in one transaction, so a profile can
 * never exist that nobody is able to see. Responds 201 with the created
 * profile, 400 on missing/invalid fields, or 409 on a duplicate CPF.
 */
router.post("/", async (req: Request, res: Response) => {
  const user = req.user!;
  const body = req.body ?? {};

  const missing = missingFields(body, [
    "cpf",
    "firstName",
    "lastName",
    "birthDate",
    "scholarship",
  ]);
  if (missing.length) {
    return res
      .status(400)
      .json({ error: `missing fields: ${missing.join(", ")}` });
  }

  const cpf = normalizeCpf(body.cpf);
  if (!cpf || !isValidCpf(cpf)) {
    return res.status(400).json({ error: "cpf is not a valid CPF" });
  }

  const birthDate = new Date(body.birthDate);
  if (Number.isNaN(birthDate.getTime())) {
    return res.status(400).json({ error: "birthDate must be a valid date" });
  }

  const caregiverId =
    user.role === "profissional" && typeof body.caregiverId === "number"
      ? body.caregiverId
      : user.id;

  if (caregiverId !== user.id) {
    const caregiver = await prisma.user.findUnique({
      where: { id: caregiverId },
      select: { id: true },
    });
    if (!caregiver) {
      return res
        .status(400)
        .json({ error: "caregiverId does not match an existing user" });
    }
  }

  const userIds = [...new Set([user.id, caregiverId])];

  try {
    const profile = await prisma.$transaction(async (tx) => {
      const created = await tx.profile.create({
        data: {
          cpf,
          firstName: body.firstName,
          lastName: body.lastName,
          birthDate,
          sex: optionalText(body.sex),
          scholarship: body.scholarship,
          medicalConditions: Array.isArray(body.medicalConditions)
            ? body.medicalConditions.map(String)
            : [],
          notes: optionalText(body.notes),
          caregiverId,
        },
      });

      await tx.profileAccess.createMany({
        data: userIds.map((userId) => ({ profileId: created.id, userId })),
      });

      return created;
    });

    return res.status(201).json(profile);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ error: "An elderly profile with this CPF already exists" });
    }
    throw error;
  }
});

/**
 * GET /perfis — list the profiles the requester is linked to. The same rule
 * applies to both roles; a profissional no longer sees every profile in the
 * system.
 */
router.get("/", async (req: Request, res: Response) => {
  const user = req.user!;

  const profiles = await prisma.profile.findMany({
    where: { access: { some: { userId: user.id } } },
    orderBy: { id: "asc" },
  });

  return res.json(profiles);
});

/**
 * Reads and validates the `{ cpf, birthDate }` pair the binding flow is built
 * on. Returns the normalized CPF and date, or null when either is unusable.
 */
function readIdentity(
  body: Record<string, unknown>,
): { cpf: string; birthDate: Date } | null {
  const cpf = normalizeCpf(body.cpf);
  if (!cpf || !isValidCpf(cpf)) return null;

  const birthDate = new Date(body.birthDate as string);
  if (Number.isNaN(birthDate.getTime())) return null;

  return { cpf, birthDate };
}

/**
 * Finds the profile matching both the CPF and the date of birth. Returns
 * `"novo"` when the CPF is unknown, `"nao_confere"` when it exists but the date
 * does not match, and the profile itself when both agree.
 *
 * Requiring the date as well as the CPF is what stops a CPF alone from granting
 * access to an elder's health record — CPFs circulate freely in Brazil. Both
 * values are still discoverable, so this raises the bar rather than closing the
 * hole; the check is isolated here so an invite-code or approval step can
 * replace it without touching the routes.
 */
async function matchIdentity(cpf: string, birthDate: Date) {
  const profile = await prisma.profile.findUnique({ where: { cpf } });
  if (!profile) return { status: "novo" as const, profile: null };

  const sameDay =
    profile.birthDate.toISOString().slice(0, 10) ===
    birthDate.toISOString().slice(0, 10);

  return sameDay
    ? { status: "encontrado" as const, profile }
    : { status: "nao_confere" as const, profile: null };
}

/**
 * POST /perfis/verificar — first step of registering an elder: says whether the
 * CPF is already known and whether the date of birth confirms it.
 *
 * Deliberately returns nothing but the status. Answering with the elder's name
 * or id would turn this into a lookup service that maps a CPF to an identified
 * person in an eldercare system, which is exactly the disclosure the binding
 * check exists to prevent. The endpoint requires authentication and sits behind
 * the global rate limiter to make enumeration expensive.
 */
router.post("/verificar", async (req: Request, res: Response) => {
  const identity = readIdentity(req.body ?? {});
  if (!identity) {
    return res
      .status(400)
      .json({ error: "cpf and birthDate are required and must be valid" });
  }

  const { status } = await matchIdentity(identity.cpf, identity.birthDate);
  return res.json({ status });
});

/**
 * POST /perfis/vincular — grants the requester access to an elder already in
 * the system, given a matching CPF and date of birth.
 *
 * Both values are re-checked here rather than trusting whatever the client held
 * from its /verificar call. Binding is idempotent: re-linking is a no-op, not an
 * error, so a retried request cannot fail. A failed match answers a generic 404
 * so this route cannot be used to distinguish "no such CPF" from "wrong date".
 */
router.post("/vincular", async (req: Request, res: Response) => {
  const user = req.user!;

  const identity = readIdentity(req.body ?? {});
  if (!identity) {
    return res
      .status(400)
      .json({ error: "cpf and birthDate are required and must be valid" });
  }

  const { profile } = await matchIdentity(identity.cpf, identity.birthDate);
  if (!profile) {
    return res.status(404).json({ error: "elderly profile not found" });
  }

  await prisma.profileAccess.upsert({
    where: { profileId_userId: { profileId: profile.id, userId: user.id } },
    update: {},
    create: { profileId: profile.id, userId: user.id },
  });

  return res.status(201).json(profile);
});

/**
 * GET /perfis/:id — fetch a single profile. Existence and access are enforced
 * by loadProfile, which attaches the profile to the request.
 */
router.get("/:id", loadProfile, (req: Request, res: Response) => {
  return res.json(req.profile);
});

/**
 * GET /perfis/:id/detalhes — the elder's detail view in a single call: the
 * profile, its latest weekly check-in (null when none was recorded yet) and
 * its open alerts, newest first. Existence and access are enforced by
 * loadProfile.
 */
router.get(
  "/:id/detalhes",
  loadProfile,
  async (req: Request, res: Response) => {
    const profileId = req.profile!.id;

    const [latestCheckIn, alerts] = await Promise.all([
      prisma.checkIn.findFirst({
        where: { profileId },
        orderBy: { date: "desc" },
      }),
      prisma.alert.findMany({
        where: { profileId, resolvedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return res.json({ profile: req.profile, latestCheckIn, alerts });
  },
);

/**
 * PUT /perfis/:id — update a profile's editable fields. Only fields present in
 * the body are changed; ownership is never reassigned here.
 */
router.put("/:id", loadProfile, async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const data: Prisma.ProfileUpdateInput = {};

  if (body.firstName !== undefined) data.firstName = body.firstName;
  if (body.lastName !== undefined) data.lastName = body.lastName;
  if (body.scholarship !== undefined) data.scholarship = body.scholarship;
  if (body.sex !== undefined) data.sex = optionalText(body.sex);
  if (body.notes !== undefined) data.notes = optionalText(body.notes);

  if (body.medicalConditions !== undefined) {
    if (!Array.isArray(body.medicalConditions)) {
      return res
        .status(400)
        .json({ error: "medicalConditions must be an array" });
    }
    data.medicalConditions = body.medicalConditions.map(String);
  }

  if (body.birthDate !== undefined) {
    const birthDate = new Date(body.birthDate);
    if (Number.isNaN(birthDate.getTime())) {
      return res.status(400).json({ error: "birthDate must be a valid date" });
    }
    data.birthDate = birthDate;
  }

  const profile = await prisma.profile.update({
    where: { id: req.profile!.id },
    data,
  });

  return res.json(profile);
});

/**
 * DELETE /perfis/:id — delete a profile along with its medications and routines
 * (cascade). Responds 204 with no body.
 */
router.delete("/:id", loadProfile, async (req: Request, res: Response) => {
  await prisma.profile.delete({ where: { id: req.profile!.id } });
  return res.status(204).send();
});

export default router;
