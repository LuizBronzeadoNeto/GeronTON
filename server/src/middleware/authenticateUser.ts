import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "../lib/prisma.js";

export interface AuthPayload {
  id: number;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Validates the bearer token and populates `req.user`. Responds 401 on a
 * missing, malformed, expired or unverifiable token.
 *
 * The accepted algorithm is pinned to HS256, the one POST /login signs with, so
 * a token cannot be presented under a different algorithm than the one intended.
 * The secret is read per request rather than captured at import time, so
 * assertEnv() is guaranteed to have run first regardless of module load order.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing/Malformed authorization header" });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string, {
      algorithms: ["HS256"],
    }) as unknown as AuthPayload;
    if (!payload.id || !payload.role)
      return res.status(401).json({ error: "Invalid token payload." });

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
