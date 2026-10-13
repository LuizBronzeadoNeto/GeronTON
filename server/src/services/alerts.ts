import type { CheckIn, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { evaluateCheckIn } from "../utils/risk.js";

/**
 * Label of the alert raised when the caregiver stops submitting weekly reports
 * (Portaria GM/MS nº 9.584/2025), signaling the care team to schedule active
 * outreach.
 */
export const WEAKENED_HOME_BOND_MESSAGE = "Vínculo Domiciliar Fragilizado";

/**
 * Weeks without a weekly report before the home bond is considered weakened.
 */
export const OMISSION_WEEKS = 4;

/**
 * Synchronizes the persisted clinical alerts derived from a check-in's vital
 * signs (blood-pressure outlier, metabolic decompensation, sarcopenia risk).
 * Open alerts are replaced so an update reflects the corrected measurements.
 * Alerts a professional already resolved are kept, verdict included, and a
 * flag matching one of them is not raised again. All vital-sign alerts carry
 * "attention" severity.
 */
export async function syncCheckInAlerts(checkIn: CheckIn): Promise<void> {
  const { flags } = evaluateCheckIn(checkIn);

  const resolved = await prisma.alert.findMany({
    where: { checkInId: checkIn.id, resolvedAt: { not: null } },
    select: { type: true, message: true },
  });
  const pending = flags.filter(
    (flag) =>
      !resolved.some(
        (alert) => alert.type === flag.type && alert.message === flag.message,
      ),
  );

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.alert.deleteMany({
      where: { checkInId: checkIn.id, resolvedAt: null },
    }),
  ];

  if (pending.length > 0) {
    operations.push(
      prisma.alert.createMany({
        data: pending.map((flag) => ({
          profileId: checkIn.profileId,
          checkInId: checkIn.id,
          type: flag.type,
          severity: "attention" as const,
          message: flag.message,
        })),
      }),
    );
  }

  await prisma.$transaction(operations);
}

/**
 * Resolves any open "Vínculo Domiciliar Fragilizado" alert for the profile —
 * called when a new weekly report arrives, re-establishing the home bond.
 */
export async function resolveHomeBondAlerts(profileId: number): Promise<void> {
  await prisma.alert.updateMany({
    where: { profileId, type: "weakened_home_bond", resolvedAt: null },
    data: { resolvedAt: new Date() },
  });
}

/**
 * Background monitoring pass: raises an "attention" alert labeled "Vínculo
 * Domiciliar Fragilizado" for every profile whose caregiver has not submitted
 * a weekly report for 4 consecutive weeks (counting from the profile's
 * creation when it never had one). A profile with an open alert of this type
 * is skipped, so the alert is not duplicated while unresolved. Returns the
 * number of alerts created.
 */
export async function detectCheckInOmissions(
  now = new Date(),
): Promise<number> {
  const cutoff = new Date(
    now.getTime() - OMISSION_WEEKS * 7 * 24 * 60 * 60 * 1000,
  );

  const profiles = await prisma.profile.findMany({
    where: {
      alerts: { none: { type: "weakened_home_bond", resolvedAt: null } },
      checkIns: { none: { date: { gte: cutoff } } },
    },
    select: {
      id: true,
      createdAt: true,
      checkIns: {
        select: { date: true },
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });

  const omitted = profiles.filter((profile) => {
    const lastContact = profile.checkIns[0]?.date ?? profile.createdAt;
    return lastContact < cutoff;
  });

  if (omitted.length === 0) return 0;

  const { count } = await prisma.alert.createMany({
    data: omitted.map((profile) => ({
      profileId: profile.id,
      type: "weakened_home_bond" as const,
      severity: "attention" as const,
      message: `${WEAKENED_HOME_BOND_MESSAGE}: sem check-in semanal há ${OMISSION_WEEKS} semanas. Entrar em contato com a família.`,
    })),
  });

  return count;
}
