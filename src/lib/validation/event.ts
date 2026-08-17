// event creation, validated at the boundary. A night is a woman's name and a date.
import { z } from "zod";

export const eventSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((n) => n.toUpperCase())
    .refine((n) => /^[A-Z]+$/.test(n)), // one woman's first name — letters only
  index: z
    .string()
    .trim()
    .regex(/^\d{3}$/),
  city: z.enum(["BEIRUT", "MADRID"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venueName: z.string().trim().max(120).optional().default(""),
  venueAddress: z.string().trim().max(240).optional().default(""),
  venueNotes: z.string().trim().max(500).optional().default(""),
  capacityTotal: z.coerce.number().int().min(1).max(5000),
  capacityRoses: z.coerce.number().int().min(0).max(5000),
  capacityStems: z.coerce.number().int().min(0).max(5000),
  rsvpOpensAt: z.string().optional().default(""),
  rsvpDeadline: z.string().optional().default(""),
  stemsAllowed: z.coerce.boolean().default(true),
  stemPriceCents: z.coerce.number().int().min(0).default(0),
  stemCurrency: z.string().trim().toUpperCase().length(3).default("USD"),
  editionMark: z.string().trim().min(1).max(60),
  tablesEnabled: z.coerce.boolean().default(true),
  tablesRemovedAtLocal: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default("01:00"),
});

export type EventInput = z.infer<typeof eventSchema>;

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
