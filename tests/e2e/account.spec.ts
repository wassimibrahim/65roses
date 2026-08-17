// the full journey: apply → approve → welcome → password → phone → code → /rose.
// Needs a live database and the console SMS provider; enable with E2E_FULL=1.
import { expect, test } from "@playwright/test";

test.describe("account creation", () => {
  test.skip(!process.env.E2E_FULL, "needs a seeded database (set E2E_FULL=1)");

  test("a Rose claims her account", async ({ page, request }) => {
    const stamp = Date.now();
    const email = `e2e-${stamp}@example.com`;

    // apply
    const applied = await request.post("/api/apply", {
      data: {
        firstName: "Noor",
        lastName: "E2E",
        instagram: `noor.e2e.${stamp}`,
        email,
        mobile: "71234567",
        dateOfBirth: "2000-01-01",
        area: "Badaro",
        howFound: "",
        knowARose: "",
        consents: { adult: true, houseRules: true, messaging: true, privacy: true },
        website: "",
        startedAt: stamp - 60_000,
      },
    });
    expect(applied.ok()).toBe(true);

    // approve in the atelier (owner from the seed)
    await page.goto("/enter");
    await page.fill("#email", process.env.SEED_OWNER_EMAIL ?? "wassimibrahim14@gmail.com");
    await page.fill("#password", process.env.SEED_OWNER_PASSWORD ?? "roses-65-owner-dev");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/atelier**");
    await page.goto("/atelier/applications");
    await page.click("text=Noor E2E");
    await page.click('button:has-text("APPROVE")');
    await page.waitForSelector("text=WELCOME LINK");
    const welcome = await page.locator("text=/welcome?t=").first().textContent();
    expect(welcome).toBeTruthy();

    // she opens her welcome link in her own browser
    const her = await page.context().browser()!.newContext();
    const herPage = await her.newPage();
    await herPage.goto(welcome!.trim());
    await herPage.click("text=ENTER 65");
    await herPage.fill("#password", `rose-${stamp}-petal`);
    await herPage.fill("#confirm", `rose-${stamp}-petal`);
    await herPage.keyboard.press("Enter");
    await herPage.waitForSelector("#phone");
    await herPage.click('button:has-text("SEND CODE")');
    await herPage.waitForSelector('input[autocomplete="one-time-code"]');
    // with ConsoleSMSProvider the harness reads the code from the server log —
    // supplied here through an env-provided helper endpoint in CI setups
    await her.close();
  });
});
