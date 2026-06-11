import { Router } from "express";
import { pool, Role, type UserRow } from "../db.js";
import jwt from "jsonwebtoken";

const router = Router();

/**
 * POST /login — authenticate a user by email and password.
 *
 * Responds with `{ id, role, token }` on success, 401 on invalid credentials, and 400
 * on a malformed body. The client holds onto the returned
 * user. The password column is never included in the response.
 *
 * TODO: passwords are stored in plain text for the MVP. Replace the equality
 * check with `bcrypt.compare(password, user.password)` once hashing is added.
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "email and password are required" });
  }

  const { rows } = await pool.query<UserRow>(
    "SELECT id, email, password, role FROM users WHERE email = $1",
    [email],
  );

  const user = rows[0];

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const token = jwt.sign({id: user.id, email: user.email, role: user.role}, 
    process.env.JWT_SECRET!,
    {expiresIn: "2h"}
  );
  return res.json({id: user.id, role: user.role, token});
});

export default router;
