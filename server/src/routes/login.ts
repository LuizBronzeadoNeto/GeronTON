import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";

const router = Router();

/**
 * POST /login — authenticate a user by email and password.
 *
 * Responds with `{ id, role, token }` on success, 401 on invalid credentials, and 400
 * on a malformed body. The returned token is a 2h JWT carrying `{ id, email, role }`.
 * The password is never included in the response.
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
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "2h" },
  );

  return res.json({ id: user.id, role: user.role, token });
});

export default router;
