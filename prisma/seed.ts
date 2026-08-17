// dev seed — the number sequence at 64 (next: 0065) and one OWNER for the atelier.
// Idempotent. Never run against production with default credentials.
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  await prisma.memberNumberSequence.upsert({
    where: { id: 1 },
    create: { id: 1, current: 64 },
    update: {},
  });

  const email = process.env.SEED_OWNER_EMAIL ?? "wassimibrahim14@gmail.com";
  const password = process.env.SEED_OWNER_PASSWORD ?? "roses-65-owner-dev";
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      role: "OWNER",
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
    },
    update: {},
  });

  console.log(`seeded owner ${email}`);
}

main().finally(() => prisma.$disconnect());
