import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { loadProfile } from "../middleware/loadProfile.js";
import { missingFields, parseId } from "../utils/validation.js";

const router = Router({ mergeParams: true });

router.use(loadProfile);

/**
 * POST /perfis/:perfilId/rotinas — add a routine entry to the profile.
 * Responds 201 with the created routine, or 400 on missing fields.
 */
router.post("/", async (req: Request, res: Response) => {
  const body = req.body ?? {};

  const missing = missingFields(body, ["title", "period"]);
  if (missing.length) {
    return res
      .status(400)
      .json({ error: `missing fields: ${missing.join(", ")}` });
  }

  const routine = await prisma.routine.create({
    data: {
      profileId: req.profile!.id,
      title: body.title,
      period: body.period,
      description:
        typeof body.description === "string" ? body.description : null,
    },
  });

  return res.status(201).json(routine);
});

/**
 * GET /perfis/:perfilId/rotinas — list the profile's routine entries.
 */
router.get("/", async (req: Request, res: Response) => {
  const routines = await prisma.routine.findMany({
    where: { profileId: req.profile!.id },
    orderBy: { id: "asc" },
  });

  return res.json(routines);
});

/**
 * GET /perfis/:perfilId/rotinas/:rotinaId — fetch one routine entry.
 * 404 if it does not belong to the profile.
 */
router.get("/:rotinaId", async (req: Request, res: Response) => {
  const id = parseId(req.params.rotinaId);
  if (id === null) {
    return res.status(400).json({ error: "invalid routine id" });
  }

  const routine = await prisma.routine.findFirst({
    where: { id, profileId: req.profile!.id },
  });

  if (!routine) {
    return res.status(404).json({ error: "routine not found" });
  }

  return res.json(routine);
});

/**
 * PUT /perfis/:perfilId/rotinas/:rotinaId — update a routine entry. Only fields
 * present in the body are changed. 404 if not found on the profile.
 */
router.put("/:rotinaId", async (req: Request, res: Response) => {
  const id = parseId(req.params.rotinaId);
  if (id === null) {
    return res.status(400).json({ error: "invalid routine id" });
  }

  const existing = await prisma.routine.findFirst({
    where: { id, profileId: req.profile!.id },
  });

  if (!existing) {
    return res.status(404).json({ error: "routine not found" });
  }

  const body = req.body ?? {};
  const data: Prisma.RoutineUpdateInput = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.period !== undefined) data.period = body.period;
  if (body.description !== undefined) {
    data.description =
      body.description === null || body.description === ""
        ? null
        : String(body.description);
  }

  const routine = await prisma.routine.update({ where: { id }, data });
  return res.json(routine);
});

/**
 * DELETE /perfis/:perfilId/rotinas/:rotinaId — remove a routine entry.
 * Responds 204, or 404 if not found on the profile.
 */
router.delete("/:rotinaId", async (req: Request, res: Response) => {
  const id = parseId(req.params.rotinaId);
  if (id === null) {
    return res.status(400).json({ error: "invalid routine id" });
  }

  const existing = await prisma.routine.findFirst({
    where: { id, profileId: req.profile!.id },
  });

  if (!existing) {
    return res.status(404).json({ error: "routine not found" });
  }

  await prisma.routine.delete({ where: { id } });
  return res.status(204).send();
});

export default router;
