/**
 * Usage:
 *   npx tsx scripts/set-password.ts <username> <new-password>
 *
 * Sets (or resets) the credential-account password for a user.
 * Validates the password policy before writing.
 */

import { prisma } from "../lib/prisma";
import { hashPassword } from "better-auth/crypto";
import { validatePassword } from "../lib/password";

async function main() {
  const [, , username, password] = process.argv;

  if (!username || !password) {
    console.error("Usage: npx tsx scripts/set-password.ts <username> <new-password>");
    process.exit(1);
  }

  const policyError = validatePassword(password);
  if (policyError) {
    console.error(`Password policy error: ${policyError}`);
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { username },
  });

  if (!user) {
    console.error(`User not found: "${username}"`);
    process.exit(1);
  }

  const hashed = await hashPassword(password);

  const existing = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });

  if (existing) {
    await prisma.account.update({
      where: { id: existing.id },
      data: { password: hashed },
    });
  } else {
    await prisma.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: user.id,
        providerId: "credential",
        password: hashed,
        userId: user.id,
      },
    });
  }

  console.log(`Password updated for user "${username}" (${user.name}).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect() as Promise<void>);
