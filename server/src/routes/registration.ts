import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma, Role } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authenticateUser.js";
import { requireRole } from "../middleware/requireRole.js";
import bcrypt from "bcrypt";
import { SALT_ROUNDS } from "../config/auth.js";
import { normalizeCrm } from "../utils/crm.js";

/**
 * Builds a router exposing `POST /` that registers a new user with the given
 * role. Shared by POST /cuidadores and POST /profissionais, which differ only
 * in the role assigned to the created account.
 *
 * Responds with `{ id, email, role }` on success, 409 on a duplicate email or
 * CRM, and 400 on a malformed body. Only a healthcare professional may register
 * accounts; the requester is authenticated via the session's bearer token.
 *
 * A `profissional` must supply a `crm`, which uniquely identifies them as a
 * practitioner; a `cuidador` has none and any value sent is ignored.
 *
 * Created passwords are hashed using 12 SALT rounds in order to prevent identification.
 */
export function buildRegistrationRouter(role: Role): Router {
  const router = Router();

  router.post(
    "/",
    authMiddleware,
    requireRole("profissional"),
    async (req: Request, res: Response) => {
      const { email, password } = req.body ?? {};

      if (
        typeof email !== "string" ||
        email === "" ||
        typeof password !== "string" ||
        password === ""
      ) {
        return res
          .status(400)
          .json({ error: "email and password are required." });
      }

      let crm: string | null = null;
      if (role === Role.profissional) {
        crm = normalizeCrm(req.body?.crm);
        if (!crm) {
          return res
            .status(400)
            .json({ error: "crm is required and must be valid" });
        }
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      try {
        const user = await prisma.user.create({
          data: { email, password: hashedPassword, role, crm },
          select: { id: true, email: true, role: true, crm: true },
        });
        return res.status(201).json(user);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const target = String(error.meta?.target ?? "");
          return res.status(409).json({
            error: target.includes("crm")
              ? "A user with this CRM already exists"
              : "A user with this email already exists",
          });
        }
        throw error;
      }
    },
  );

  return router;
}
