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
 * - 403 if the requester has no ProfileAccess row for it.
 *
 * Access is link-based and identical for both roles: a `profissional` used to
 * reach every profile in the system implicitly, which meant any clinician could
 * read any elder's health record. Membership is now explicit, granted either by
 * registering the elder or by binding to them through POST /perfis/vincular.
 *
 * Every nested resource (medications, routines, check-ins, intercorrences, risk
 * and alerts) mounts behind this middleware, so this single check governs them
 * all.
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

  const [profile, access] = await Promise.all([
    prisma.profile.findUnique({ where: { id } }),
    prisma.profileAccess.findUnique({
      where: { profileId_userId: { profileId: id, userId: user.id } },
    }),
  ]);

  if (!profile) {
    return res.status(404).json({ error: "profile not found" });
  }

  if (!access) {
    return res
      .status(403)
      .json({ error: "You do not have access to this profile." });
  }

  req.profile = profile;
  next();
}
