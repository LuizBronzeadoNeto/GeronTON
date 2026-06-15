import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authenticateUser.js";
import { loadProfile } from "../middleware/loadProfile.js";
import { missingFields } from "../utils/validation.js";
import medicationsRouter from "./medications.js";
import routinesRouter from "./routines.js";

const router = Router();

router.use(authMiddleware);

router.use("/:perfilId/medicamentos", medicationsRouter);
router.use("/:perfilId/rotinas", routinesRouter);

/**
 * POST /perfis — create an elderly profile.
 *
 * A cuidador becomes the owner; a profissional may assign the profile to a
 * caregiver via `caregiverId` in the body, otherwise becomes the owner. Responds
 * 201 with the created profile, or 400 on missing/invalid fields.
 */
router.post("/", async (req: Request, res: Response) => {
  const user = req.user!;
  const body = req.body ?? {};

  const missing = missingFields(body, [
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

  const birthDate = new Date(body.birthDate);
  if (Number.isNaN(birthDate.getTime())) {
    return res.status(400).json({ error: "birthDate must be a valid date" });
  }

  const caregiverId =
    user.role === "profissional" && typeof body.caregiverId === "number"
      ? body.caregiverId
      : user.id;

  const profile = await prisma.profile.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      birthDate,
      scholarship: body.scholarship,
      medicalConditions: Array.isArray(body.medicalConditions)
        ? body.medicalConditions.map(String)
        : [],
      caregiverId,
    },
  });

  return res.status(201).json(profile);
});

/**
 * GET /perfis — list profiles. A cuidador sees only the profiles they manage;
 * a profissional sees all of them.
 */
router.get("/", async (req: Request, res: Response) => {
  const user = req.user!;
  const where = user.role === "cuidador" ? { caregiverId: user.id } : {};

  const profiles = await prisma.profile.findMany({
    where,
    orderBy: { id: "asc" },
  });

  return res.json(profiles);
});

/**
 * GET /perfis/:id — fetch a single profile. Existence and access are enforced
 * by loadProfile, which attaches the profile to the request.
 */
router.get("/:id", loadProfile, (req: Request, res: Response) => {
  return res.json(req.profile);
});

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
