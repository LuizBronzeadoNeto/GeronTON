import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();
import { SALT_ROUNDS } from "../src/config/auth";

/**
 * Seeds the two demo accounts used for local development and the integration
 * tests. Idempotent: re-running upserts the same users without duplicating them.
 */
async function main(): Promise<void> {
  await prisma.user.upsert({
    where: { email: "cuidador@demo.com" },
    update: { password: await bcrypt.hash("senha123", SALT_ROUNDS) },
    create: {
      email: "cuidador@demo.com",
      password: await bcrypt.hash("senha123", SALT_ROUNDS),
      role: Role.cuidador,
    },
  });

  await prisma.user.upsert({
    where: { email: "profissional@demo.com" },
    update: { password: await bcrypt.hash("senha123", SALT_ROUNDS) },
    create: {
      email: "profissional@demo.com",
      password: await bcrypt.hash("senha123", SALT_ROUNDS),
      role: Role.profissional,
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
