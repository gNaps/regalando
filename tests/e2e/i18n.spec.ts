import { expect, test } from "@playwright/test";

test("la lingua scelta aggiorna landing, metadata e informative e rimane dopo il reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  await page.getByRole("combobox", { name: "Lingua", exact: true }).selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The right gift starts with you.");
  await expect(page).toHaveTitle("Regalando — wishes in good company");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Language", exact: true })).toHaveValue("en");
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "1. Who handles your data", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to home", exact: true })).toBeVisible();
  await page.goto("/cookie");
  await expect(page.getByRole("heading", { name: "Language preference", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("it");
  await expect(page.getByRole("heading", { name: "Preferenza della lingua", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("il server rispetta il browser e il cookie anche senza JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, locale: "en-GB", javaScriptEnabled: false, extraHTTPHeaders: { "Accept-Language": "en-GB,en;q=0.9,it;q=0.5" } });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The right gift starts with you.");
    await context.addCookies([{ name: "regalando-locale", value: "it", url: baseURL! }]);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Il regalo giusto comincia da te.");
  } finally { await context.close(); }
});
