// Auth.js (next-auth v5) — credentials against argon2id, silent lockout after 5 misses.
// The OTP second factor gates member sessions at the /enter/verify step.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "@/lib/crypto/hash";

const LOCKOUT_AFTER = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/enter" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { member: { select: { id: true, phoneVerified: true } } },
        });
        // every failure is the same failure: "NOT IT." — no user enumeration
        if (!user?.passwordHash || user.deletedAt) return null;
        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) return null;

        const ok = await verifyPassword(user.passwordHash, password);
        if (!ok) {
          const failed = user.failedLoginCount + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: failed,
              // silent lockout — she is never told she is locked out
              lockedUntil: failed >= LOCKOUT_AFTER ? new Date(Date.now() + LOCKOUT_MS) : null,
            },
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          // staff have no member profile and no phone step
          phoneVerified: user.member?.phoneVerified ?? user.role !== "MEMBER",
          memberId: user.member?.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.phoneVerified = user.phoneVerified;
        token.memberId = user.memberId;
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as {
        sub?: string;
        role?: import("@prisma/client").Role;
        phoneVerified?: boolean;
        memberId?: string;
      };
      session.user.id = t.sub ?? "";
      session.user.role = t.role ?? "MEMBER";
      session.user.phoneVerified = t.phoneVerified ?? false;
      session.user.memberId = t.memberId;
      return session;
    },
  },
});
