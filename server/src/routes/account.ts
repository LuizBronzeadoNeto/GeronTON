import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/authenticateUser.js";

const router = Router();

/**
 * DELETE /conta
 *
 * Deletes the signed-in user's account, the self-service side of the right to
 * erasure (LGPD Art. 18). The current password is required so a phone left
 * signed in can't be used to wipe someone's account.
 *
 * Elders the user registered are handled one by one. If nobody else is linked
 * to the elder, the record goes with the account. If someone else is, the
 * record stays and ownership passes to another linked caregiver (or a
 * professional when there is none), since other people rely on that history.
 * Alerts the user resolved and missed signals they recorded keep existing with
 * the author cleared, which the schema already does on delete.
 *
 * A wrong password answers 403, not 401, because the app treats any 401 as an
 * expired session and signs the user out.
 */
router.delete("/", authMiddleware, async (req: Request, res: Response) => {
  const { password } = req.body ?? {};
  if (typeof password !== "string" || password === "") {
    return res.status(400).json({ error: "password is required" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    return res.status(404).json({ error: "user not found" });
  }
  if (!(await bcrypt.compare(password, user.password))) {
    return res.status(403).json({ error: "wrong password" });
  }

  await prisma.$transaction(async (tx) => {
    const owned = await tx.profile.findMany({
      where: { caregiverId: user.id },
      select: {
        id: true,
        access: {
          where: { userId: { not: user.id } },
          orderBy: { createdAt: "asc" },
          select: { userId: true, user: { select: { role: true } } },
        },
      },
    });

    for (const profile of owned) {
      const heir =
        profile.access.find((link) => link.user.role === "cuidador") ??
        profile.access[0];

      if (heir) {
        await tx.profile.update({
          where: { id: profile.id },
          data: { caregiverId: heir.userId },
        });
      } else {
        await tx.profile.delete({ where: { id: profile.id } });
      }
    }

    await tx.user.delete({ where: { id: user.id } });
  });

  return res.status(204).send();
});

export default router;
