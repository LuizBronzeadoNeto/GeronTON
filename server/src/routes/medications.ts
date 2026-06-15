import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { loadProfile } from "../middleware/loadProfile.js";
import { missingFields } from "../utils/validation.js";

const router = Router({ mergeParams: true });

router.use(loadProfile);

/**
 * POST /perfis/:perfilId/medicamentos - add a medication to the profile.
 * Responds 201 with the created medication, or 400 on missing fields.
 */
router.post("/", async (req: Request, res: Response) => {
  const body = req.body ?? {};

  const missing = missingFields(body, ["name", "dosage", "frequency"]);
  if (missing.length) {
    return res
      .status(400)
      .json({ error: `missing fields: ${missing.join(", ")}` });
  }

  const medication = await prisma.medication.create({
    data: {
      profileId: req.profile!.id,
      name: body.name,
      dosage: body.dosage,
      frequency: body.frequency,
      notes: typeof body.notes === "string" ? body.notes : null,
    },
  });

  return res.status(201).json(medication);
});

/**
 * GET /perfis/:perfilId/medicamentos - list the profile's medications.
 */
router.get("/", async (req: Request, res: Response) => {
  const medications = await prisma.medication.findMany({
    where: { profileId: req.profile!.id },
    orderBy: { id: "asc" },
  });

  return res.json(medications);
});

/**
 * GET /perfis/:perfilId/medicamentos/:medicamentoId - fetch one medication.
 * 404 if it does not belong to the profile.
 */
router.get("/:medicamentoId", async (req: Request, res: Response) => {
  const medication = await prisma.medication.findFirst({
    where: { id: Number(req.params.medicamentoId), profileId: req.profile!.id },
  });

  if (!medication) {
    return res.status(404).json({ error: "medication not found" });
  }

  return res.json(medication);
});

/**
 * PUT /perfis/:perfilId/medicamentos/:medicamentoId - update a medication.
 * Only fields present in the body are changed. 404 if not found on the profile.
 */
router.put("/:medicamentoId", async (req: Request, res: Response) => {
  const id = Number(req.params.medicamentoId);
  const existing = await prisma.medication.findFirst({
    where: { id, profileId: req.profile!.id },
  });

  if (!existing) {
    return res.status(404).json({ error: "medication not found" });
  }

  const body = req.body ?? {};
  const data: Prisma.MedicationUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.dosage !== undefined) data.dosage = body.dosage;
  if (body.frequency !== undefined) data.frequency = body.frequency;
  if (body.notes !== undefined) {
    data.notes =
      body.notes === null || body.notes === "" ? null : String(body.notes);
  }

  const medication = await prisma.medication.update({ where: { id }, data });
  return res.json(medication);
});

/**
 * DELETE /perfis/:perfilId/medicamentos/:medicamentoId - remove a medication.
 * Responds 204, or 404 if not found on the profile.
 */
router.delete("/:medicamentoId", async (req: Request, res: Response) => {
  const id = Number(req.params.medicamentoId);
  const existing = await prisma.medication.findFirst({
    where: { id, profileId: req.profile!.id },
  });

  if (!existing) {
    return res.status(404).json({ error: "medication not found" });
  }

  await prisma.medication.delete({ where: { id } });
  return res.status(204).send();
});

export default router;
