import { test, expect } from "@playwright/test";

test("le liste reali richiedono accesso e il login è disponibile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "La protezione delle route non dipende dalla viewport.");
  await page.goto("/lists");
  if (new URL(page.url()).pathname === "/setup") {
    test.skip(true, "Credenziali Clerk assenti: la route resta protetta dal setup.");
  }
  await expect(page).toHaveURL(/\/sign-in(?:\?|$)/);
  await expect(page.getByRole("link", { name: "Regalando, homepage" })).toBeVisible();
  await expect(page.locator(".custom-auth")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Email o nome utente")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continua", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Accedi" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("sign-in.png"), fullPage: true });
});
