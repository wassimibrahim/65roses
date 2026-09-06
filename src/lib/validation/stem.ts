// her Stem, validated at the boundary
import { z } from "zod";
import { isAdult, normalizeInstagram, normalizePhone } from "./apply";

export const stemSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  mobile: z
    .string()
    .trim()
    .transform(normalizePhone)
    .refine((p): p is string => p !== null),
  instagram: z
    .string()
    .trim()
    .transform((v) => (v ? normalizeInstagram(v) : ""))
    .refine((h) => h === "" || /^[a-z0-9._]{1,30}$/.test(h))
    .optional()
    .default(""),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    .optional()
    .default(""),
  dateOfBirth: z.coerce.date().refine((d) => isAdult(d)),
  note: z.string().trim().max(200).optional().default(""),
});

export type StemInput = z.infer<typeof stemSchema>;
