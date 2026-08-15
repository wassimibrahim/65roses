// smoke test — proves the Playwright wiring works; real journeys arrive with the pages
import { expect, test } from "@playwright/test";

test("the world answers", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
});
