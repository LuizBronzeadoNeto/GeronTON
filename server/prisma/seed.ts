import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();
import { SALT_ROUNDS } from "../src/config/auth";
import { CONSENT_VERSION } from "../src/config/consent";

/**
 * Seeds the two demo accounts used for local development and the integration
 * tests. Idempotent: re-running upserts the same users without duplicating them.
 *
 * Both are marked as having accepted the current consent term, otherwise every
 * demo login (and the Maestro flows) would stop on the consent screen.
 */
async function main(): Promise<void> {
  const consent = {
    consentVersion: CONSENT_VERSION,
    consentAcceptedAt: new Date(),
  };

  await prisma.user.upsert({
    where: { email: "cuidador@demo.com" },
    update: {
      password: await bcrypt.hash("senha123", SALT_ROUNDS),
      ...consent,
    },
    create: {
      email: "cuidador@demo.com",
      password: await bcrypt.hash("senha123", SALT_ROUNDS),
      role: Role.cuidador,
      ...consent,
    },
  });

  await prisma.user.upsert({
    where: { email: "profissional@demo.com" },
    update: {
      password: await bcrypt.hash("senha123", SALT_ROUNDS),
      ...consent,
    },
    create: {
      email: "profissional@demo.com",
      password: await bcrypt.hash("senha123", SALT_ROUNDS),
      role: Role.profissional,
      ...consent,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
