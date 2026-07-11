import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma, Role } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authenticateUser.js";
import { requireRole } from "../middleware/requireRole.js";

/**
 * Builds a router exposing `POST /` that registers a new user with the given
 * role. Shared by POST /cuidadores and POST /profissionais, which differ only
 * in the role assigned to the created account.
 *
 * Responds with `{ id, email, role }` on success, 409 on a duplicate email, and
 * 400 on a malformed body. Only a healthcare professional may register accounts;
 * the requester is authenticated via the session's bearer token.
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

      try {
        const user = await prisma.user.create({
          data: { email, password, role },
          select: { id: true, email: true, role: true },
        });
        return res.status(201).json(user);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return res
            .status(409)
            .json({ error: "A user with this email already exists" });
        }
        throw error;
      }
    },
  );

  return router;
}
