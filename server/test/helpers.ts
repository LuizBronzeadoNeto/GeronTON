import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

/**
 * Shared fixture helpers for the integration tests. Not a test file itself —
 * jest only collects `*.test.ts`.
 */

/**
 * Links a user to a profile directly in the database.
 *
 * Access is link-based for every role, so a professional reaches a caregiver's
 * elder only once bound to them. Suites whose subject is something else
 * (check-ins, alerts, triage ordering) use this to arrange that precondition
 * without routing every fixture through the binding flow; the binding flow has
 * its own coverage in profile_access.test.ts.
 */
export async function grantProfileAccess(
  profileId: number,
  email: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user with email ${email}`);

  await prisma.profileAccess.upsert({
    where: { profileId_userId: { profileId, userId: user.id } },
    update: {},
    create: { profileId, userId: user.id },
  });
}

/**
 * Computes one CPF check digit, deliberately reimplemented here rather than
 * imported from src/utils/cpf.ts so a bug in the validator cannot be masked by
 * fixtures built with the same faulty arithmetic.
 */
function checkDigit(digits: string, length: number): number {
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += Number(digits[index]) * (length + 1 - index);
  }
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

/**
 * Builds a checksum-valid CPF from a 9-digit base, so each test file can use a
 * distinct accepted value without hardcoding a real person's number. CPFs are
 * unique across profiles, so fixtures in different files must not collide.
 */
export function makeCpf(base: string): string {
  const nine = base.padStart(9, "0").slice(-9);
  const first = checkDigit(nine, 9);
  const second = checkDigit(`${nine}${first}`, 10);
  return `${nine}${first}${second}`;
}

/**
 * Creates a professional account and returns its token. For suites that need
 * a professional linked to nothing but their own fixtures, so results don't
 * pick up profiles other suites linked to the seeded profissional@demo.com.
 * Remove the account in afterAll.
 */
export async function signUpProfessional(
  email: string,
  crm: string,
): Promise<string> {
  const password = "senha12345";
  await request(app).post("/profissionais").send({ email, password, crm });
  const res = await request(app).post("/login").send({ email, password });
  if (res.status !== 200) throw new Error(`Could not sign in as ${email}`);
  return res.body.token;
}
