/**
 * Prompts shown in the Terra Intelligence box.
 *
 * These live outside src/server/intelligence.ts because a "use server" module
 * may only export async functions — a constant exported from one is wrapped as
 * a server-action reference and is not an array by the time it reaches the
 * client.
 */
export const EXAMPLE_QUESTIONS = [
  "Show me family-owned schools in Madrid with more than 700 students and owned real estate",
  "Which active investor mandates fit Colegio Monteverde?",
  "Who can introduce us to Colegio Puerta del Mar?",
  "Show every Spanish school transaction since 2020 in our database",
  "Which relationships have gone cold?",
  "What are the strongest proprietary opportunities we have not contacted?",
  "What changed in our Madrid pipeline this month?",
] as const;
