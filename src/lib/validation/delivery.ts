import { z } from "zod";
import { normalizePhone } from "./apply";

// Where the Rose should find her. Nothing here is ever inferred — not the city,
// not the area, not from an IP, not from a previous order. She says it or we
// do not know it.
export const deliverySchema = z.object({
  recipientName: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .transform((v) => normalizePhone(v) ?? "")
    .refine((v) => v !== "", { message: "phone" }),
  city: z.enum(["BEIRUT", "MADRID"]),
  area: z.string().trim().min(2).max(80),
  addressLine: z.string().trim().min(6).max(400),
  notes: z.string().trim().max(300).optional().default(""),
});

export type DeliveryInput = z.infer<typeof deliverySchema>;
