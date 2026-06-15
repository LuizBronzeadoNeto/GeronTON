import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET!;

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
    const payload = jwt.verify(token, JWT_SECRET) as unknown as AuthPayload;
    if (!payload.id || !payload.role)
      return res.status(401).json({ error: "Invalid token payload." });

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
