"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function signInAction(formData: FormData) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      // Never distinguish "no such user" from "wrong password".
      return { error: "Those credentials were not recognised." };
    }
    throw error;
  }
}
