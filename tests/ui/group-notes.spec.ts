import { expect, test, type Page } from "@playwright/test";

async function openGift(page: Page, title: string) {
  await page.getByRole("button", { name: `Dettagli di ${title}`, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: title, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("un partecipante aderisce alla proposta di un amico, aggiorna la quota ed esce", async ({ page }) => {
  await page.goto("/?participant&console&with-proposal");
  const card = page.locator(".gift-card", { hasText: "Una console" });
  await expect(card).toContainText("Di gruppo");
  await expect(card).toContainText("1 amico partecipa");
  const dialog = await openGift(page, "Una console");
  await expect(dialog.getByRole("heading", { name: "Regalo di gruppo" })).toBeVisible();
  await expect(dialog).toContainText(/100\s?€ su 500\s?€/);
  await expect(dialog.getByRole("list", { name: "Chi partecipa" })).toContainText("Marco");
  await dialog.getByRole("button", { name: "Partecipo" }).click();
  await expect(dialog.getByLabel("Il tuo nome", { exact: true })).toHaveCount(0);
  await dialog.getByLabel(/Quota indicativa/).fill("50");
  await dialog.getByRole("button", { name: "Conferma partecipazione" }).click();
  await expect(dialog.getByRole("heading", { name: /Partecipi con 50\s?€/ })).toBeVisible();
  await expect(dialog).toContainText(/150\s?€ su 500\s?€/);
  await expect(dialog.getByRole("button", { name: "Lo regalo da solo" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Modifica quota" }).click();
  await expect(dialog.getByLabel(/Quota indicativa/)).toHaveValue("50");
  await dialog.getByLabel(/Quota indicativa/).fill("100");
  await dialog.getByRole("button", { name: "Salva quota" }).click();
  await expect(dialog.getByRole("heading", { name: /Partecipi con 100\s?€/ })).toBeVisible();
  await dialog.getByRole("button", { name: "Esci dal gruppo" }).click();
  await dialog.getByRole("button", { name: "Conferma uscita" }).click();
  await expect(dialog.getByRole("button", { name: "Partecipo" })).toBeVisible();
  await dialog.getByRole("button", { name: "Chiudi", exact: true }).click();
  await expect(card).toContainText("1 amico partecipa");
});

test("chi sceglie un regalo libero può proporlo di gruppo o aprirlo dopo averlo prenotato", async ({ page }) => {
  await page.goto("/?participant&console");
  let dialog = await openGift(page, "Una console");
  await dialog.getByRole("button", { name: "Proponi regalo di gruppo" }).click();
  await expect(dialog.getByRole("heading", { name: "Proponi un regalo di gruppo" })).toBeVisible();
  await dialog.getByLabel(/Quota indicativa/).fill("120");
  await dialog.getByRole("button", { name: "Conferma proposta" }).click();
  await expect(dialog.getByRole("heading", { name: /Partecipi con 120\s?€/ })).toBeVisible();
  await expect(dialog).toContainText(/120\s?€ su 500\s?€/);
  // Alone in the group, the proposer can go back to a solo gift.
  await dialog.getByRole("button", { name: "Lo regalo da solo" }).click();
  await expect(dialog.getByRole("heading", { name: "Lo regali tu" })).toBeVisible();
  await dialog.getByRole("button", { name: "Apri al gruppo" }).click();
  await expect(dialog.getByRole("heading", { name: "Partecipi anche tu" })).toBeVisible();
  await dialog.getByRole("button", { name: "Chiudi", exact: true }).click();
  await expect(page.locator(".gift-card", { hasText: "Una console" })).toContainText("Partecipi tu");

  dialog = await openGift(page, "Cuffie");
  await dialog.getByRole("button", { name: "Prenota regalo", exact: true }).click();
  await dialog.getByRole("button", { name: "Conferma prenotazione" }).click();
  await expect(dialog.getByRole("heading", { name: "Lo regali tu" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Apri al gruppo" })).toBeVisible();
});

test("un ospite propone il gruppo con il nome obbligatorio e senza quota", async ({ page }) => {
  await page.goto("/?screen=invite&guest&console");
  await page.getByRole("button", { name: "Accedi come ospite" }).click();
  const dialog = await openGift(page, "Una console");
  await dialog.getByRole("button", { name: "Proponi regalo di gruppo" }).click();
  await expect(dialog.getByLabel("Il tuo nome", { exact: true })).toHaveAttribute("required", "");
  await dialog.getByLabel("Il tuo nome", { exact: true }).fill("Anna");
  await dialog.getByRole("button", { name: "Conferma proposta" }).click();
  await expect(dialog.getByRole("heading", { name: "Partecipi anche tu" })).toBeVisible();
  await expect(dialog.getByRole("list", { name: "Chi partecipa" })).toContainText("quota da definire");
});

test("le note tra amici si leggono, si scrivono e si eliminano solo le proprie", async ({ page }) => {
  await page.goto("/?participant&with-notes");
  await expect(page.locator(".gift-card", { hasText: "Un libro" })).toContainText("1 nota tra amici");
  const dialog = await openGift(page, "Un libro");
  const notes = dialog.getByRole("region", { name: "Note tra amici" });
  await expect(notes).toContainText("mai a Gabriele");
  await expect(notes).toContainText("Marco");
  await expect(notes).toContainText("Io prendo l’edizione rilegata");
  await expect(notes.getByRole("button", { name: "Elimina la nota" })).toHaveCount(0);
  const send = notes.getByRole("button", { name: "Invia nota" });
  await expect(send).toBeDisabled();
  await notes.getByLabel("Nuova nota").fill("Io incarto e porto il biglietto");
  await send.click();
  await expect(notes).toContainText("Io incarto e porto il biglietto");
  await expect(notes.locator(".note-item.mine")).toContainText("Tu");
  await expect(notes.getByLabel("Nuova nota")).toHaveValue("");
  await notes.getByRole("button", { name: "Elimina la nota" }).click();
  await expect(notes).not.toContainText("Io incarto e porto il biglietto");
  await expect(notes).toContainText("Marco");
  await dialog.getByRole("button", { name: "Chiudi", exact: true }).click();
  await expect(page.locator(".gift-card", { hasText: "Un libro" })).toContainText("1 nota tra amici");
});

test("un ospite scrive una nota con il nome e un errore conserva il testo", async ({ page }) => {
  await page.goto("/?screen=invite&guest&note-error");
  await page.getByRole("button", { name: "Accedi come ospite" }).click();
  const dialog = await openGift(page, "Un libro");
  const notes = dialog.getByRole("region", { name: "Note tra amici" });
  await expect(notes.getByLabel("Firma la nota")).toHaveAttribute("required", "");
  await notes.getByLabel("Firma la nota").fill("Anna");
  await notes.getByLabel("Nuova nota").fill("Arrivo io con la torta");
  await notes.getByRole("button", { name: "Invia nota" }).click();
  await expect(notes.getByRole("alert")).toContainText("Non siamo riusciti a salvare la nota");
  await expect(notes.getByLabel("Nuova nota")).toHaveValue("Arrivo io con la torta");
});

test("il proprietario non vede proposte di gruppo, partecipanti, quote o note", async ({ page }) => {
  await page.goto("/?console&with-proposal&with-notes");
  const card = page.locator(".gift-card", { hasText: "Una console" });
  await expect(card).not.toContainText("Di gruppo");
  await expect(card).not.toContainText("partecipa");
  const dialog = await openGift(page, "Una console");
  await expect(dialog).not.toContainText("gruppo");
  await expect(dialog.getByRole("region", { name: "Note tra amici" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Partecipo" })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Marco");
  await dialog.getByRole("button", { name: "Chiudi", exact: true }).click();
  await page.getByRole("button", { name: "Dettagli di Un libro", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Un libro", exact: true })).not.toContainText("Note tra amici");
  await page.getByRole("button", { name: "Modifica regalo", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Modifica regalo" }).getByLabel("Regalo di gruppo")).toHaveCount(0);
});
