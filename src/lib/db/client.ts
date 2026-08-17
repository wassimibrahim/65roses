// Prisma client singleton — the only place the client is constructed.
// The field-encryption extension attaches here so PII is encrypted on every path.
import { PrismaClient } from "@prisma/client";
import { fieldEncryptionExtension } from "@/lib/crypto/encrypt";

function build() {
  return new PrismaClient().$extends(fieldEncryptionExtension);
}

type Db = ReturnType<typeof build>;

const globalForPrisma = globalThis as unknown as { prisma?: Db };

export const prisma: Db = globalForPrisma.prisma ?? build();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
