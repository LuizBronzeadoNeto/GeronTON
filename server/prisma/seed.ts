import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seeds the two demo accounts used for local development and the integration
 * tests. Idempotent: re-running upserts the same users without duplicating them.
 */
async function main(): Promise<void> {
  await prisma.user.upsert({
    where: { email: "cuidador@demo.com" },
    update: {},
    create: {
      email: "cuidador@demo.com",
      password: "senha123",
      role: Role.cuidador,
    },
  });

  await prisma.user.upsert({
    where: { email: "profissional@demo.com" },
    update: {},
    create: {
      email: "profissional@demo.com",
      password: "senha123",
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
