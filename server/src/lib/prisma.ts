import { PrismaClient } from "@prisma/client";

export { Role } from "@prisma/client";

/**
 * Shared Prisma client. A single instance is reused across the app so the
 * connection pool is not recreated on every import.
 */
export const prisma = new PrismaClient();
