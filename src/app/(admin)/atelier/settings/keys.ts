// Setting keys the atelier owns. Outside actions.ts because a "use server"
// module may only export functions.
export const TEXT_KEYS = {
  houseRules: "text.house_rules",
  privacy: "text.privacy",
  terms: "text.terms",
  cities: "flags.cities",
} as const;
