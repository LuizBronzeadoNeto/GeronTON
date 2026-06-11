import { Request, Response, NextFunction } from "express";
import { AuthPayload } from "./authenticateUser.js";

export function requireRole(...roles: AuthPayload["role"][])
{
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({error: "Not authenticated."});
        if (!roles.includes(req.user.role)) return res.status(403).json({error: "You do not have permission to do this."});
        next();
    };
}