import type { NextFunction, Request, Response } from "express";
import { pool, type Role } from "../db.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: Role };
    }
  }
}

/**
 * MVP-only identity middleware for protected routes.
 *
 * Reads the id returned by /login from the `X-User-Id` header and attaches the
 * matching user to `req.user`. 
 * 
 * IMPORTANT: This is intentionally INSECURE, with no token or session, any client 
 * can claim any id, and exists only so routes know which profile is calling. 
 * Replace with real auth before production.
 */
export async function identifyUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const id = Number(req.header("X-User-Id"));
  if (!id) {
    return res.status(401).json({ error: "missing user id" });
  }

  const { rows } = await pool.query<{ id: number; role: Role }>(
    "SELECT id, role FROM users WHERE id = $1",
    [id],
  );

  if (!rows[0]) {
    return res.status(401).json({ error: "unknown user" });
  }

  req.user = rows[0];
  next();
}
