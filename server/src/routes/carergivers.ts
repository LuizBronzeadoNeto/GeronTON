import { Router, Request, Response } from "express";
import { pool, type UserRow } from "../db.js";
import { authMiddleware } from "../middleware/authenticateUser.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

/**
 * POST /cuidadores — create a new caregiver type user with an email and password.
 *
 * Responds with `{ id, email, role }` on success, 409 on duplicate conflicts and 400
 * on a malformed body. Accounts may only be registered by a healthcare professional,
 * authentication is based on the session's token.
**/
router.post("/", authMiddleware, requireRole("profissional"), async (req: Request, res: Response) => {
    const {email, password} = req.body;

    if (!email || !password) return res.status(400).json({error: "email and password are required."});
    try{
        const existing = await pool.query<UserRow>(
            "SELECT id FROM users WHERE email = $1", 
            [email]
        );
        if (existing.rows.length > 0) return res.status(409).json({error: "A user with this email already exists"});

        const result = await pool.query("INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role",
            [email, password, "cuidador"]
        );

        return res.status(201).json(result.rows[0])
    } catch(err){
        console.error("POST /cuidadores error", err);
        return res.status(500).json({error: "Internal server error"});
    }
});

export default router;