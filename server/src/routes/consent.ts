import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authenticateUser.js";
import { CONSENT_VERSION } from "../config/consent.js";

const router = Router();

/**
 * POST /consentimento
 *
 * Records that the signed-in user accepted the consent term. The body carries
 * the version they saw, which has to match the current one so an outdated app
 * can't sign off on a text the user never read. Answers with the stored
 * version and timestamp.
 */
router.post("/", authMiddleware, async (req: Request, res: Response) => {
  const { version } = req.body ?? {};
  if (version !== CONSENT_VERSION) {
    return res
      .status(400)
      .json({ error: "version does not match the current consent term" });
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { consentVersion: CONSENT_VERSION, consentAcceptedAt: new Date() },
    select: { consentVersion: true, consentAcceptedAt: true },
  });

  return res.json(user);
});

export default router;
