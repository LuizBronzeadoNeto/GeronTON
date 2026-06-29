import { Router, Request, Response } from "express";
import { loadProfile } from "../middleware/loadProfile.js";
import { prisma } from "../lib/prisma.js";

const router = Router({ mergeParams: true });

router.use(loadProfile);

const EVENT_TYPES = [
  "fall",
  "fever",
  "choking",
  "breathing difficulties",
  "bleeding",
  "confusion",
  "chest_pain",
  "other",
] as const;

router.post("/", async (req: Request, res: Response) => {
  const { eventType, isCritical, description } = req.body;
  if (!eventType || !EVENT_TYPES.includes(eventType)) {
    return res.status(400).json({
      error: `Invalid event type '${eventType}', must be one of: ${EVENT_TYPES.join(", ")}`,
    });
  }

  if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({ error: "description is required." });
  }
  if (typeof isCritical !== "boolean") {
    return res.status(400).json({ error: "isSevere must be a boolean." });
  }
  const intercorrence = await prisma.intercorrence.create({
    data: {
      profileId: req.profile!.id,
      eventType,
      isCritical,
      description: description?.trim() ?? "",
    },
  });
  return res.status(201).json(intercorrence);
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id))
    return res.status(400).json({ error: "Invalid id." });

  try {
    const intercorrence = await prisma.intercorrence.findUnique({
      where: { id },
    });

    if (!intercorrence || intercorrence.profileId !== req.profile!.id) {
      return res.status(404).json({ error: "Intercorrence not found." });
    }

    return res.json(intercorrence);
  } catch (err) {
    console.error("GET /intercorrencias/:id error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id))
    return res.status(400).json({ error: "Invalid id." });

  try {
    const existing = await prisma.intercorrence.findUnique({ where: { id } });

    if (!existing || existing.profileId !== req.profile!.id) {
      return res.status(404).json({ error: "Intercorrence not found." });
    }

    await prisma.intercorrence.delete({ where: { id } });

    return res.status(204).send();
  } catch (err) {
    console.error("DELETE /intercorrences/:id error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
