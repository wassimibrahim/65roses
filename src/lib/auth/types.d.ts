// session shape — role and phone verification ride the JWT
import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    phoneVerified: boolean;
    memberId?: string;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      phoneVerified: boolean;
      memberId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    phoneVerified?: boolean;
    memberId?: string;
  }
}
