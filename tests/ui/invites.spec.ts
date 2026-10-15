import { expect, test } from "@playwright/test";

test("il proprietario crea, copia, rigenera e disattiva il link con conferma", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Invita amici", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Invita amici" });
  await dialog.getByRole("button", { name: "Crea link di invito" }).click();
  await expect(dialog.getByLabel("Link di invito")).toHaveValue(new RegExp(`/invite/${"A".repeat(43)}$`));
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { document.body.dataset.copied = text; } } }));
  await dialog.getByRole("button", { name: "Copia link" }).click();
  await expect(dialog.getByRole("status")).toContainText("Link copiato");
  await expect(page.locator("body")).toHaveAttribute("data-copied", new RegExp(`/invite/${"A".repeat(43)}$`));
  await dialog.getByRole("button", { name: "Rigenera link" }).click();
  await expect(dialog.getByLabel("Link di invito")).toHaveValue(new RegExp(`${"A".repeat(43)}$`));
  await dialog.getByRole("button", { name: "Conferma", exact: true }).click();
  await expect(dialog.getByLabel("Link di invito")).toHaveValue(new RegExp(`${"B".repeat(43)}$`));
  await dialog.getByRole("button", { name: "Disattiva link" }).click();
  await dialog.getByRole("button", { name: "Conferma", exact: true }).click();
  await expect(dialog.getByLabel("Link di invito")).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Crea link di invito" })).toBeVisible();
  await expect(dialog.getByRole("status")).toContainText("mantengono l’accesso");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("rimozione e riabilitazione dei partecipanti non mostrano scelte o prenotazioni", async ({ page }, testInfo) => {
  await page.goto("/?with-link&with-member");
  await page.getByRole("button", { name: "Invita amici", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Invita amici" });
  await expect(dialog.locator(".member-list")).toContainText("Accesso attivo");
  await dialog.getByRole("button", { name: "Rimuovi Giulia" }).click();
  await expect(dialog.getByRole("heading", { name: "Rimuovere Giulia?" })).toBeVisible();
  await dialog.getByRole("button", { name: "Annulla", exact: true }).click();
  await expect(dialog.locator(".member-list")).toContainText("Accesso attivo");
  await dialog.getByRole("button", { name: "Rimuovi Giulia" }).click();
  await dialog.getByRole("button", { name: "Conferma", exact: true }).click();
  await expect(dialog.locator(".member-list")).toContainText("Accesso rimosso");
  await dialog.getByRole("button", { name: "Riabilita Giulia" }).click();
  await expect(dialog.locator(".member-list")).toContainText("Accesso attivo");
  await expect(dialog.locator(".member-list")).not.toContainText("Prenotato");
  await page.screenshot({ path: testInfo.outputPath("invite-manager.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Invita amici", exact: true })).toBeFocused();
});

test("gli errori mantengono disponibile il pannello inviti", async ({ page }) => {
  await page.goto("/?invite-error");
  await page.getByRole("button", { name: "Invita amici", exact: true }).click();
  await page.getByRole("button", { name: "Crea link di invito" }).click();
  await expect(page.getByRole("alert")).toContainText("Riprova");
  await expect(page.getByRole("button", { name: "Crea link di invito" })).toBeEnabled();
});

test("l’anteprima anonima è minima e conserva l’invito in accesso e registrazione", async ({ page }, testInfo) => {
  await page.goto("/?screen=invite&guest");
  await expect(page.getByRole("heading", { name: "Compleanno", exact: true })).toBeVisible();
  await expect(page.getByText("Gabriele vuole condividere")).toBeVisible();
  await expect(page.getByRole("link", { name: "Accedi", exact: true })).toHaveAttribute("href", `/sign-in?redirect_url=${encodeURIComponent(`/invite/${"A".repeat(43)}`)}`);
  await expect(page.getByRole("link", { name: "Registrati", exact: true })).toHaveAttribute("href", `/sign-up?redirect_url=${encodeURIComponent(`/invite/${"A".repeat(43)}`)}`);
  await expect(page.locator("body")).not.toContainText("Un libro");
  await expect(page.locator("body")).not.toContainText("Le mie idee regalo");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("invite-preview.png"), fullPage: true });
});

test("un utente autenticato conferma l’ingresso prima di aprire la lista", async ({ page }) => {
  await page.goto("/?screen=invite");
  await page.getByRole("button", { name: "Accetta invito" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-joined", "true");
  await expect(page.locator("body")).toHaveAttribute("data-destination", "/lists/fixture-list");
});

test("invito invalido, accesso revocato e lista archiviata non offrono ingresso", async ({ page }) => {
  for (const [query, message] of [["invalid-invite&guest", "Questo invito non è disponibile"], ["revoked", "Il tuo accesso non è disponibile"], ["archived", "Questa lista è archiviata"]]) {
    await page.goto(`/?screen=invite&${query}`);
    await expect(page.getByRole("heading", { name: message, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Accetta invito" })).toHaveCount(0);
  }
});

test("l’amico ritrova la lista e legge i regali senza comandi del proprietario", async ({ page }) => {
  await page.goto("/?screen=friends");
  await expect(page.getByRole("link", { name: /Compleanno/ })).toHaveAttribute("href", "/lists/fixture-list");
  await page.goto("/?participant");
  await expect(page.getByRole("link", { name: "Liste degli amici" })).toHaveAttribute("href", "/friends");
  await page.getByRole("button", { name: "Dettagli di Un libro" }).click();
  await expect(page.getByRole("dialog", { name: "Un libro", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Vai al sito/ })).toHaveAttribute("href", "https://example.com/libro");
  await expect(page.getByRole("button", { name: "Modifica regalo" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Elimina" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Invita amici" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Aggiungi regalo" })).toHaveCount(0);
});

test("dopo il login la destinazione rimane l’invito originale", async ({ page }) => {
  const path = `/invite/${"A".repeat(43)}`;
  await page.goto(`/?auth=signin&redirect_url=${encodeURIComponent(path)}`);
  await page.getByLabel("Email o nome utente").fill("giulia@example.org");
  await page.getByRole("button", { name: "Continua", exact: true }).click();
  await page.getByLabel("Password", { exact: true }).fill("valid-password");
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-destination", path);
});
