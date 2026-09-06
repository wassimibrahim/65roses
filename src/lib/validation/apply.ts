// the application, validated at the server boundary. The client repeats these
// checks for feel; this file is the truth.
import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizePhone(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input, "LB");
  return parsed?.isValid() ? parsed.number : null;
}

export function normalizeInstagram(input: string): string {
  return input.trim().replace(/^@+/, "").toLowerCase();
}

export function isAdult(dateOfBirth: Date, now: Date = new Date()): boolean {
  const cutoff = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
  return dateOfBirth.getTime() <= cutoff.getTime();
}

export const applySchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  instagram: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .transform(normalizeInstagram)
    .refine((h) => /^[a-z0-9._]{1,30}$/.test(h)),
  email: z.string().trim().toLowerCase().email().max(254),
  mobile: z
    .string()
    .trim()
    .transform(normalizePhone)
    .refine((p): p is string => p !== null),
  dateOfBirth: z.coerce.date().refine((d) => isAdult(d)),
  area: z.string().trim().max(80).optional().default(""),
  howFound: z.string().trim().max(280).optional().default(""),
  knowARose: z.string().trim().max(60).optional().default(""),
  consents: z.object({
    adult: z.literal(true),
    houseRules: z.literal(true),
    messaging: z.literal(true),
    privacy: z.literal(true),
  }),
  // fast-track referral invite token, if she arrived through one
  r: z.string().max(64).optional().default(""),
  // bot checks — never mentioned in the UI
  website: z.string().max(0).optional().default(""), // honeypot: any content is a bot
  startedAt: z.number().int().positive(),
});

export type ApplyInput = z.infer<typeof applySchema>;
