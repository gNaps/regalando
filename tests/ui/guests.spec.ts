import { expect, test, type Page } from "@playwright/test";

async function openGuest(page: Page, query = "") {
  await page.goto(`/?screen=invite&guest${query}`);
  await page.getByRole("button", { name: "Accedi come ospite" }).click();
  await expect(page.getByText("Sei qui come ospite", { exact: true })).toBeVisible();
}
async function openGift(page: Page) {
  await page.getByRole("button", { name: "Dettagli di Un libro", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Un libro", exact: true })).toBeVisible();
}

test("l’ospite entra senza nome, torna dal link nello stesso browser e lo può copiare", async ({ page }) => {
  await openGuest(page);
  await expect(page.getByLabel("Il tuo nome", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dettagli di Un libro" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Sei qui come ospite", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Accedi come ospite" })).toHaveCount(0);
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { document.body.dataset.copied = text; } } }));
  await page.getByRole("button", { name: "Copia link della lista" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-copied", new RegExp(`/invite/${"A".repeat(43)}$`));
  // Sharing carries only the ordinary invite, never the browser credential.
  expect(await page.locator("body").getAttribute("data-copied")).not.toContain("S".repeat(43));
  await expect(page.locator("body")).toContainText("cancellando i dati del sito");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("nome obbligatorio alla prenotazione; conferma e annullamento aggiornano la disponibilità", async ({ page }, testInfo) => {
  await openGuest(page);
  await openGift(page);
  await page.getByRole("button", { name: "Prenota regalo", exact: true }).click();
  const input = page.getByLabel("Il tuo nome", { exact: true });
  await expect(input).toHaveAttribute("required", "");
  await page.getByRole("button", { name: "Conferma prenotazione" }).click();
  await expect(page.locator("body")).not.toHaveAttribute("data-booking-calls");
  await input.fill("Anna");
  await page.screenshot({ path: testInfo.outputPath("guest-reservation.png"), fullPage: true });
  await page.getByRole("button", { name: "Conferma prenotazione" }).click();
  await expect(page.getByRole("heading", { name: "Lo regali tu" })).toBeVisible();
  await page.getByRole("button", { name: "Annulla prenotazione", exact: true }).click();
  await page.getByRole("button", { name: "Conferma annullamento" }).click();
  await expect(page.getByRole("button", { name: "Prenota regalo", exact: true })).toBeVisible();
});

test("il regalo scelto da un’altra persona non offre una seconda prenotazione", async ({ page }) => {
  await openGuest(page, "&taken");
  await openGift(page);
  await expect(page.getByRole("heading", { name: "Già prenotato" })).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Prenotato da Anna");
  await expect(page.getByRole("button", { name: "Prenota regalo" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Annulla prenotazione" })).toHaveCount(0);
});

test("errore di prenotazione conserva il nome e permette di riprovare", async ({ page }) => {
  await openGuest(page, "&booking-error");
  await openGift(page);
  await page.getByRole("button", { name: "Prenota regalo", exact: true }).click();
  await page.getByLabel("Il tuo nome", { exact: true }).fill("Anna");
  await page.getByRole("button", { name: "Conferma prenotazione" }).click();
  await expect(page.getByRole("alert")).toContainText("Riprova");
  await expect(page.getByLabel("Il tuo nome", { exact: true })).toHaveValue("Anna");
  await expect(page.getByRole("button", { name: "Conferma prenotazione" })).toBeEnabled();
});

test("browser senza memoria locale segnala l’errore senza confermare l’accesso", async ({ page }) => {
  await page.addInitScript(() => Storage.prototype.setItem = () => { throw new Error("Storage blocked"); });
  await page.goto("/?screen=invite&guest");
  await page.getByRole("button", { name: "Accedi come ospite" }).click();
  await expect(page.getByRole("alert")).toContainText("Consenti il salvataggio");
  await expect(page.getByRole("button", { name: "Accedi come ospite" })).toBeEnabled();
  await expect(page.getByText("Sei qui come ospite", { exact: true })).toHaveCount(0);
});

test("una sessione ospite revocata resta bloccata anche tornando dal link", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem(`regalando:guest:${"A".repeat(43)}`, "S".repeat(43)));
  await page.goto("/?screen=invite&guest&revoked");
  await expect(page.getByRole("heading", { name: "Il tuo accesso ospite non è disponibile" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Accedi come ospite" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dettagli di Un libro" })).toHaveCount(0);
});

test("il proprietario gestisce accessi ospite senza ricevere il nome della prenotazione", async ({ page }) => {
  await page.goto("/?with-guest&with-link");
  await page.getByRole("button", { name: "Invita amici", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Invita amici" });
  await expect(dialog).toContainText("Ospite 1");
  await expect(dialog).not.toContainText("Anna");
  await dialog.getByRole("button", { name: "Rimuovi Ospite 1" }).click();
  await dialog.getByRole("button", { name: "Conferma", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Riabilita Ospite 1" })).toBeVisible();
  await dialog.getByRole("button", { name: "Riabilita Ospite 1" }).click();
  await expect(dialog.getByRole("button", { name: "Rimuovi Ospite 1" })).toBeVisible();
});

test("anche l’utente con account può prenotare senza inserire un secondo nome", async ({ page }) => {
  await page.goto("/?participant");
  await openGift(page);
  await page.getByRole("button", { name: "Prenota regalo", exact: true }).click();
  await expect(page.getByLabel("Il tuo nome", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Conferma prenotazione" }).click();
  await expect(page.getByRole("heading", { name: "Lo regali tu" })).toBeVisible();
});
