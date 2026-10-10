import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/**
 * Days are counted in Brazilian time, so someone using the app at 22h isn't
 * logged on the next day just because UTC already turned over.
 */
const TIME_ZONE = "America/Sao_Paulo";

const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar day (YYYY-MM-DD) of a moment, in São Paulo time. */
export function localDay(date: Date): string {
  return dayFormat.format(date);
}

/**
 * Accounts already logged today by this process, so the database is hit once
 * per account per day instead of on every request. It only holds today's
 * keys and is dropped when the day changes.
 */
let seenDay = "";
const seen = new Set<string>();

/**
 * Records that the user used the app today. Called on every authenticated
 * request, and safe to call that often: after the first call of the day it
 * returns without touching the database, and the unique (userId, day) index
 * keeps a second process or a restart from adding a duplicate.
 *
 * Never throws. Usage numbers are not worth failing a request over.
 */
export async function recordAccess(
  user: { id: number; role: Role },
  now = new Date(),
): Promise<void> {
  const day = localDay(now);
  if (day !== seenDay) {
    seenDay = day;
    seen.clear();
  }

  const key = `${user.id}`;
  if (seen.has(key)) return;
  seen.add(key);

  try {
    await prisma.accessLog.createMany({
      data: [
        {
          userId: user.id,
          role: user.role,
          day: new Date(`${day}T00:00:00.000Z`),
        },
      ],
      skipDuplicates: true,
    });
  } catch {
    // Forget the key so the next request tries again.
    seen.delete(key);
  }
}
