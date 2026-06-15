import { Request, Response, NextFunction } from "express";
import { Profile } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

declare global {
  namespace Express {
    interface Request {
      profile?: Profile;
    }
  }
}

/**
 * Loads the profile referenced by `:perfilId` (nested routes) or `:id` (profile
 * detail routes) and enforces access before the handler runs:
 *
 * - 400 if the id is not a valid integer,
 * - 404 if no such profile exists,
 * - 403 if a `cuidador` requests a profile they do not own (a `profissional`
 *   may access any profile).
 *
 * On success the profile is attached to `req.profile` for the handler to use.
 */
export async function loadProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  const id = Number(req.params.perfilId ?? req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "invalid profile id" });
  }

  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile) {
    return res.status(404).json({ error: "profile not found" });
  }

  if (user.role === "cuidador" && profile.caregiverId !== user.id) {
    return res
      .status(403)
      .json({ error: "You do not have access to this profile." });
  }

  req.profile = profile;
  next();
}
