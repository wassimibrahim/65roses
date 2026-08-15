// Auth.js (next-auth v5) — Credentials provider, prepared for a second-factor OTP step
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/enter",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize() {
        // TODO: verify email + argon2id password hash against User,
        // then require the OTP second factor before the session is fully issued.
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token }) {
      // TODO: carry role + phoneVerified so the OTP step can gate the session
      return token;
    },
  },
});
