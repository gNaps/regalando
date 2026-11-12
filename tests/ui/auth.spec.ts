import { expect, test, type Page } from "@playwright/test";

test("lo skeleton del form è visibile sia nell’attesa della pagina sia nell’attesa di Clerk", async ({ page }) => {
  await page.goto("/?auth=signin&route-loading&clerk-loading");
  const skeleton = page.locator(".auth-sign-in-loading");
  await expect(skeleton).toBeVisible();
  await expect(skeleton.locator(".auth-loading-input")).toBeVisible();
  await expect(page.getByText("Caricamento…", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  const before = await page.locator(".auth-panel").boundingBox();
  await page.evaluate(() => window.dispatchEvent(new Event("fixture-auth-page-ready")));
  await expect(page.locator(".auth-sign-in-stage")).toBeVisible();
  await expect(skeleton.locator(".auth-loading-input")).toBeVisible();
  const after = await page.locator(".auth-panel").boundingBox();
  expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
  await page.evaluate(() => window.dispatchEvent(new Event("fixture-clerk-ready")));
  await expect(page.getByLabel("Email o nome utente")).toBeEditable();
});

test("il form compare mentre l’anteprima sfuma, senza un frame vuoto", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?auth=signin&clerk-loading");
  await expect(page.getByRole("status")).toBeVisible();
  const transition = await page.evaluate(async () => {
    const stage = document.querySelector<HTMLElement>(".auth-sign-in-stage")!;
    const placeholder = stage.querySelector<HTMLElement>(".auth-sign-in-placeholder")!;
    // Flush the initial style before changing the simulated SDK state.
    void getComputedStyle(placeholder).opacity;
    window.dispatchEvent(new Event("fixture-clerk-ready"));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const content = stage.querySelector<HTMLElement>(".auth-sign-in-content")!;
    void getComputedStyle(content).opacity;
    const animations = stage.getAnimations({ subtree: true });
    for (const animation of animations) { animation.pause(); animation.currentTime = 160; }
    const result = {
      placeholder: Number(getComputedStyle(placeholder).opacity),
      content: Number(getComputedStyle(content).opacity),
      visibility: getComputedStyle(placeholder).visibility,
    };
    for (const animation of animations) animation.finish();
    return result;
  });
  expect(transition.placeholder).toBeGreaterThan(0);
  expect(transition.placeholder).toBeLessThan(1);
  expect(transition.content).toBeGreaterThan(0);
  expect(transition.content).toBeLessThan(1);
  expect(transition.visibility).toBe("visible");
  await expect(page.locator(".auth-sign-in-placeholder")).toBeHidden();
  await expect(page.getByLabel("Email o nome utente")).toBeEditable();
});

test("il login mantiene le dimensioni durante il caricamento e rispetta il movimento ridotto", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?auth=signin&clerk-loading");
  await expect(page.getByRole("status")).toHaveText("Caricamento dell’accesso…");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continua", exact: true })).toHaveCount(0);
  const panel = page.locator(".auth-panel");
  const before = await panel.boundingBox();
  await page.evaluate(() => window.dispatchEvent(new Event("fixture-clerk-ready")));
  await expect(page.getByLabel("Email o nome utente")).toBeEditable();
  await expect(page.getByRole("status")).toHaveCount(0);
  const after = await panel.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
  await expect(page.locator(".auth-sign-in-content")).toHaveCSS("animation-name", "none");
  await identify(page);
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
});

async function identify(page: Page) {
  await page.getByLabel("Email o nome utente").fill("giulia@example.org");
  await page.getByRole("button", { name: "Continua", exact: true }).click();
}
async function verify(page: Page) {
  await page.getByLabel("Codice di verifica", { exact: true }).fill("123456");
  await page.getByRole("button", { name: /^(Accedi|Verifica e continua)$/ }).click();
}

for (const auth of ["signin", "signup"]) {
  test(`${auth}: una sessione già presente riprende la lista senza avviare Google`, async ({ page }) => {
    await page.goto(`/?auth=${auth}&existing-session&redirect_url=%2Flists%2Ffesta`);
    await expect(page.locator("body")).toHaveAttribute("data-destination", "/lists/festa");
    await expect(page.locator("body")).toHaveAttribute("data-activated", "fixture-session");
    await expect(page.locator("body")).toHaveAttribute("data-activation-attempts", "1");
    await expect(page.locator("body")).not.toHaveAttribute("data-social");
    await expect(page.getByRole("button", { name: "Continua con Google" })).toHaveCount(0);
  });

  test(`${auth}: session_exists aggiorna il client e riutilizza la sessione`, async ({ page }) => {
    const destination = `/invite/${"A".repeat(43)}`;
    await page.goto(`/?auth=${auth}&session-race&redirect_url=${encodeURIComponent(destination)}`);
    await page.getByRole("button", { name: "Continua con Google" }).click();
    await expect(page.locator("body")).toHaveAttribute("data-reloaded", "true");
    await expect(page.locator("body")).toHaveAttribute("data-activated", "fixture-session");
    await expect(page.locator("body")).toHaveAttribute("data-activation-attempts", "1");
    await expect(page.locator("body")).toHaveAttribute("data-destination", destination);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.locator("body")).not.toHaveAttribute("data-finalized");
  });
}

test("la sessione con requisiti incompleti passa dalle attività richieste", async ({ page }) => {
  await page.goto("/?auth=signin&pending-session&redirect_url=%2Flists%2Ffesta");
  await expect(page.locator("body")).toHaveAttribute("data-destination", "/sign-in/tasks?redirect_url=%2Flists%2Ffesta");
  await expect(page.locator("body")).not.toHaveAttribute("data-social");
});

test("un errore durante la ripresa della sessione permette di riprovare", async ({ page }) => {
  await page.goto("/?auth=signin&existing-session&activation-error");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Riprova", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-destination", "/lists");
  await expect(page.locator("body")).toHaveAttribute("data-activation-attempts", "2");
});

test("session_exists senza sessione recuperabile resta nel modulo", async ({ page }) => {
  await page.goto("/?auth=signin&session-race&missing-session");
  await page.getByRole("button", { name: "Continua con Google" }).click();
  await expect(page.getByRole("alert")).toContainText("Sei già connesso");
  await expect(page.locator("body")).not.toHaveAttribute("data-activated");
  await expect(page.getByRole("button", { name: "Continua con Google" })).toBeEnabled();
});

test("gli altri errori Google non attivano una sessione", async ({ page }) => {
  await page.goto("/?auth=signin&social-error");
  await page.getByRole("button", { name: "Continua con Google" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator("body")).not.toHaveAttribute("data-reloaded");
  await expect(page.locator("body")).not.toHaveAttribute("data-activated");
});

test("password errata resta nel modulo, poi l’accesso torna alla lista richiesta", async ({ page }) => {
  await page.goto("/?auth=signin&redirect_url=%2Flists%2Ffesta");
  await identify(page);
  await page.getByLabel("Password", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Controlla");
  await expect(page.locator("body")).not.toHaveAttribute("data-finalized");
  await page.getByLabel("Password", { exact: true }).fill("valid-password");
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-destination", "/lists/festa");
});

test("l’accesso senza password verifica il codice e consente di correggerlo", async ({ page }) => {
  await page.goto("/?auth=signin&code-only&redirect_url=https%3A%2F%2Fevil.example%2Flists");
  await identify(page);
  await expect(page.locator("body")).toHaveAttribute("data-sent", "1");
  await page.getByLabel("Codice di verifica", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("codice");
  await expect(page.locator("body")).not.toHaveAttribute("data-finalized");
  await verify(page);
  await expect(page.locator("body")).toHaveAttribute("data-destination", "/lists");
});

test("la verifica del nuovo dispositivo precede l’attivazione della sessione", async ({ page }) => {
  await page.goto("/?auth=signin&device-trust");
  await identify(page);
  await page.getByLabel("Password", { exact: true }).fill("valid-password");
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Un’ultima verifica" })).toBeVisible();
  await expect(page.locator("body")).not.toHaveAttribute("data-finalized");
  await page.getByRole("button", { name: "Codice via email" }).click();
  await verify(page);
  await expect(page.locator("body")).toHaveAttribute("data-finalized", "true");
});

test("un callback con MFA incompleta riprende la verifica", async ({ page }) => {
  await page.goto("/?auth=signin&resume-mfa");
  await page.getByRole("button", { name: "App di autenticazione" }).click();
  await verify(page);
  await expect(page.locator("body")).toHaveAttribute("data-finalized", "true");
});

test("il recupero password richiede il codice e revoca le altre sessioni", async ({ page }) => {
  await page.goto("/?auth=signin");
  await identify(page);
  await page.getByRole("button", { name: "Hai dimenticato la password?" }).click();
  await page.getByRole("button", { name: "Invia il codice", exact: true }).click();
  await verify(page);
  await expect(page.locator("body")).not.toHaveAttribute("data-finalized");
  await page.getByLabel("Nuova password", { exact: true }).fill("replacement-password");
  await page.getByRole("button", { name: "Salva e accedi" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-revoke", "true");
  await expect(page.locator("body")).toHaveAttribute("data-finalized", "true");
});

test("la registrazione verifica l’email prima di creare la sessione", async ({ page }) => {
  await page.goto("/?auth=signup");
  await page.getByLabel("Email", { exact: true }).fill("giulia@example.org");
  await page.getByLabel("Nome utente", { exact: false }).fill("giulia");
  await page.getByLabel("Password", { exact: true }).fill("valid-password");
  await page.getByRole("button", { name: "Crea account" }).click();
  await expect(page.getByRole("heading", { name: "Verifica la tua email" })).toBeVisible();
  await expect(page.locator("body")).not.toHaveAttribute("data-finalized");
  await verify(page);
  await expect(page.locator("body")).toHaveAttribute("data-finalized", "true");
});

test("dopo Google vengono chiesti solo i dati mancanti", async ({ page }) => {
  await page.goto("/?auth=signup&oauth-pending");
  await expect(page.getByRole("heading", { name: "Completa il tuo account" })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Email", { exact: true })).toHaveCount(0);
  await page.getByLabel("Nome utente", { exact: false }).fill("giulia");
  await page.getByRole("button", { name: "Crea account" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-finalized", "true");
});

test("il menu account si apre da tastiera, si chiude con Escape e gestisce l’uscita", async ({ page }) => {
  await page.goto("/?auth=menu");
  const trigger = page.getByLabel("Apri il menu account");
  await trigger.focus(); await trigger.press("Enter");
  await expect(page.getByText("giulia@example.org")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("giulia@example.org")).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("button", { name: "Gestisci account" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-profile", "true");
  await expect(page.locator(".account-menu")).not.toHaveAttribute("open");
  await trigger.click();
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-signed-out", "true");
});

test("se l’uscita fallisce il menu permette di riprovare", async ({ page }) => {
  await page.goto("/?auth=menu&logout-error");
  await page.getByLabel("Apri il menu account").click();
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Riprova");
  await expect(page.getByRole("button", { name: "Esci", exact: true })).toBeEnabled();
});
