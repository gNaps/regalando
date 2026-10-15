import { test, expect } from "@playwright/test";

test("l’invito è pubblico, non indicizzabile e non trasmette il link nel referrer", async ({ page }) => {
  const response = await page.goto(`/invite/${"A".repeat(43)}`);
  test.skip(new URL(page.url()).pathname === "/setup", "Credenziali Clerk assenti.");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(page).toHaveTitle("Un invito per te · Regalando");
  await expect(page.getByRole("heading", { name: "Questo invito non è disponibile" })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  await expect(page.locator(".gift-card")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("accesso e registrazione usano la UI di Regalando", async ({ page }, testInfo) => {
  await page.goto("/sign-in");
  test.skip(new URL(page.url()).pathname === "/setup", "Credenziali Clerk assenti.");
  await expect(page.locator(".custom-auth")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Accedi", exact: true })).toBeVisible();
  await expect(page.getByLabel("Email o nome utente")).toBeVisible();
  await expect(page.locator(".cl-signIn-root")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continua con Google" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("custom-sign-in.png"), fullPage: true });
  await page.getByRole("link", { name: "Registrati", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Crea il tuo account", exact: true })).toBeVisible();
  await expect(page.getByLabel("Nome utente", { exact: false })).toHaveAttribute("required", "");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Mostra password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Nascondi password" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Privacy", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("custom-sign-up.png"), fullPage: true });
});

test("le informative sono pubbliche, collegate nel footer e leggibili senza JavaScript", async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ locale: "it-IT", baseURL, javaScriptEnabled: false, viewport: testInfo.project.use.viewport, extraHTTPHeaders: { "Accept-Language": "it-IT,it;q=0.9" } });
  try {
    const page = await context.newPage();
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "Cookie", exact: true })).toHaveAttribute("href", "/cookie");
    await footer.getByRole("link", { name: "Privacy", exact: true }).click();
    await expect(page).toHaveURL("/privacy");
    await expect(page).toHaveTitle("Privacy policy · Regalando");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy policy");
    await expect(page.getByRole("link", { name: "gabriele.nap@gmail.com" }).first()).toHaveAttribute("href", "mailto:gabriele.nap@gmail.com");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("contentinfo").getByRole("link", { name: "Cookie", exact: true }).click();
    await expect(page).toHaveURL("/cookie");
    await expect(page).toHaveTitle("Cookie policy · Regalando");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cookie policy");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("cookie-policy.png"), fullPage: true });
    await page.getByRole("contentinfo").getByRole("link", { name: "Privacy", exact: true }).click();
    await expect(page).toHaveURL("/privacy");
    await page.getByRole("link", { name: "Torna alla home" }).click();
    await expect(page).toHaveURL("/");
  } finally {
    await context.close();
  }
});

test("la landing è pubblica e apre il workspace", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Il regalo giusto comincia da te.");
  for (const link of await page.getByRole("link", { name: "Crea la tua prima lista" }).all()) {
    await expect(link).toHaveAttribute("href", "/sign-up");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // Capture the whole page without freezing sections before their scroll reveal.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-reveal-state="pending"]')).toHaveCount(0);
  for (const image of await page.locator(".landing-scene img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("landing.png"), fullPage: true, animations: "disabled" });
  await page.getByRole("link", { name: "SCOPRI REGALANDO", exact: true }).click();
  await expect(page).toHaveURL(/#perche-regalando$/);
  await page.getByRole("link", { name: "Accedi", exact: true }).click();
  await expect(page).toHaveURL(/\/(?:sign-in|setup)(?:\?|$)/);
});

test("lo scroll rivela i contenuti e il movimento ridotto li rende subito disponibili", async ({ page }) => {
  await page.goto("/");
  const invitation = page.locator(".landing-invitation");
  await expect(invitation).toHaveAttribute("data-reveal-state", "pending");

  const story = page.locator(".landing-story .landing-section-heading");
  await story.scrollIntoViewIfNeeded();
  await expect(story).toHaveCSS("opacity", "1");

  await invitation.getByRole("link", { name: "Crea la tua prima lista" }).focus();
  await expect(invitation).toHaveCSS("opacity", "1");
  await expect(invitation.getByRole("link", { name: "Crea la tua prima lista" })).toBeFocused();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-reveal-state="pending"]')).toHaveCount(0);
  await expect(page.locator(".landing-hero .ribbon-image")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".landing-hero h1")).toHaveCSS("animation-name", "none");
});

test("la landing mantiene i contenuti visibili senza JavaScript", async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({
    locale: "it-IT",
    extraHTTPHeaders: { "Accept-Language": "it-IT,it;q=0.9" },
    baseURL,
    javaScriptEnabled: false,
    viewport: testInfo.project.use.viewport,
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(".landing-benefits .landing-section-heading")).toHaveCSS("opacity", "1");
    await expect(page.locator(".landing-invitation")).toHaveCSS("opacity", "1");
    await expect(page.locator('[data-reveal-state="pending"]')).toHaveCount(0);
    await expect(page.locator(".landing-invitation").getByRole("link", { name: "Crea la tua prima lista" })).toHaveAttribute("href", "/sign-up");
  } finally {
    await context.close();
  }
});
