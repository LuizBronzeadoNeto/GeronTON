import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { CONSENT_VERSION } from "../config/consent.js";

const router = Router();

/**
 * POST /login — authenticate a user by email and password.
 *
 * Responds with the user's id, role, token and consentRequired on success, 401 on
 * invalid credentials, and 400 on a malformed body. The returned token is a 2h JWT
 * carrying the id and role.
 *
 * consentRequired is true when the user hasn't accepted the current consent term
 * yet, and the app holds them on the consent screen until they do.
 * The password is never included in the response.
 *
 * The email is deliberately left out of the token. A JWT is signed but not
 * encrypted, so anything in the payload is readable by whoever holds the token
 * and travels into device storage and logs; nothing downstream needs the claim.
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "2h", algorithm: "HS256" },
  );

  return res.json({
    id: user.id,
    role: user.role,
    token,
    consentRequired: user.consentVersion !== CONSENT_VERSION,
  });
});

export default router;
