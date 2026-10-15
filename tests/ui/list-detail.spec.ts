import { expect, test } from "@playwright/test";

test("i pulsanti aprono finestre che restano aperte in StrictMode", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Un libro", exact: true });
  const dialog = page.getByRole("dialog");
  for (let attempt = 0; attempt < 3; attempt++) {
    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Un libro", exact: true })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Vai al sito" })).toHaveAttribute("href", "https://example.com/libro");
    await expect(dialog.locator(".gift-store-row")).toContainText("Libreria");
    await expect(dialog.locator(".gift-store-row")).toContainText("Milano");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
  await page.getByRole("button", { name: "Aggiungi regalo", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Nuovo regalo", exact: true })).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Nome del regalo" })).toBeFocused();
  await dialog.getByRole("button", { name: "Chiudi", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: /Sorpresa protetta/ }).click();
  await expect(dialog.getByRole("heading", { name: "La sorpresa rimane tra amici" })).toBeVisible();
  await dialog.getByRole("button", { name: "Perfetto, teniamo la sorpresa" }).click();
  await expect(dialog).toHaveCount(0);
});

test("un regalo si apre cliccando sulla sua immagine", async ({ page }) => {
  await page.goto("/");
  const card = page.locator(".gift-card").first();
  const cardBounds = (await card.boundingBox())!;
  const imageBounds = (await card.locator(".gift-image").boundingBox())!;
  await card.click({ position: { x: imageBounds.x - cardBounds.x + imageBounds.width / 2, y: imageBounds.y - cardBounds.y + imageBounds.height / 2 } });
  await expect(page.getByRole("dialog", { name: "Un libro", exact: true })).toBeVisible();
});

test("Dettagli è azionabile anche da tastiera e restituisce il focus alla chiusura", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Dettagli di Un libro", exact: true });
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Un libro", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Un libro", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Chiudi", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("il modulo salva un regalo e mantiene i dati se il salvataggio fallisce", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Aggiungi regalo", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Nuovo regalo", exact: true });
  await dialog.getByRole("textbox", { name: "Nome del regalo" }).fill("Un vaso");
  await dialog.getByRole("button", { name: "Aggiungi alla lista" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Dettagli di Un vaso", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Un vaso", exact: true })).toBeVisible();

  await page.goto("/?save-error");
  await page.getByRole("button", { name: "Aggiungi regalo", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Nuovo regalo", exact: true });
  await dialog.getByRole("textbox", { name: "Nome del regalo" }).fill("Un altro vaso");
  await dialog.getByRole("button", { name: "Aggiungi alla lista" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Non siamo riusciti a salvare il regalo");
  await expect(dialog.getByRole("textbox", { name: "Nome del regalo" })).toHaveValue("Un altro vaso");
  page.once("dialog", prompt => prompt.dismiss());
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  page.once("dialog", prompt => prompt.accept());
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("filtri e ordinamento rispondono ai click", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tecnologia", exact: true }).click();
  await expect(page.locator(".gift-card")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Cuffie", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tutti", exact: true }).click();
  await page.getByRole("combobox", { name: "Ordina per" }).selectOption("name");
  await expect(page.locator(".gift-card").first()).toContainText("Cuffie");
});

test("le dieci categorie e le tre atmosfere caricano le illustrazioni 3D", async ({ page }, testInfo) => {
  for (const [cover, asset] of [["plum", "black"], ["sage", "silver"], ["sand", "gold"]]) {
    await page.goto(`/?all-categories&cover=${cover}`);
    const illustration = page.locator(".detail-hero .cover-art img");
    await expect(illustration).toHaveAttribute("src", `/images/cover-${asset}.webp`);
    await expect.poll(() => illustration.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator(".gift-card")).toHaveCount(10);
    for (const image of await page.locator(".gift-card .product-art img").all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`list-${asset}.png`), fullPage: true });
  }
});

test("il modulo offre le dieci categorie e salva quelle nuove", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Aggiungi regalo", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nuovo regalo", exact: true });
  const category = dialog.getByRole("combobox", { name: "Categoria", exact: true });
  await expect(category.locator("option")).toHaveText(["Casa e design", "Tecnologia", "Console e videogames", "Musica", "Arte", "Viaggi", "Fashion e stile", "Beauty", "Experience", "Altro"]);
  await dialog.getByRole("textbox", { name: "Nome del regalo" }).fill("Una console");
  await category.selectOption("gaming");
  await dialog.getByRole("button", { name: "Aggiungi alla lista" }).click();
  await page.getByRole("button", { name: "Dettagli di Una console", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Una console", exact: true })).toContainText("Console e videogames");
});

test("il proprietario modifica il regalo con prezzo e luoghi precompilati", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Dettagli di Un libro", exact: true }).click();
  await page.getByRole("button", { name: "Modifica regalo", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Modifica regalo", exact: true });
  await expect(form.getByRole("textbox", { name: "Nome del regalo" })).toHaveValue("Un libro");
  await expect(form.getByRole("spinbutton", { name: "Prezzo indicativo (€)" })).toHaveValue("20");
  await expect(form.getByRole("textbox", { name: "Link online" })).toHaveValue("https://example.com/libro");
  await expect(form.getByRole("textbox", { name: "Negozio fisico", exact: true })).toHaveValue("Libreria");
  await expect(form.getByRole("textbox", { name: /Indirizzo del negozio/ })).toHaveValue("Milano");
  await form.getByRole("textbox", { name: "Nome del regalo" }).fill("Libro illustrato");
  await form.getByRole("spinbutton", { name: "Prezzo indicativo (€)" }).fill("29.95");
  await form.getByRole("button", { name: "Salva regalo" }).click();
  const detail = page.getByRole("dialog", { name: "Libro illustrato", exact: true });
  await expect(detail).toBeVisible();
  await expect(detail.locator(".detail-price")).toContainText("29,95");
  await expect(detail.locator(".gift-store-row")).toContainText("Libreria");
  await expect(detail.locator(".gift-store-row")).toContainText("Milano");
  await expect(detail.getByRole("link", { name: "Vai al sito" })).toHaveAttribute("href", "https://example.com/libro");
  await detail.getByRole("button", { name: "Chiudi", exact: true }).click();
  await expect(page.locator(".gift-card")).toHaveCount(2);
  await expect(page.locator(".gift-card").filter({ hasText: "Libro illustrato" }).locator(".gift-price")).toContainText("29,95");
});

test("annullamento e salvataggio fallito non perdono le modifiche", async ({ page }) => {
  await page.goto("/?save-error");
  await page.getByRole("button", { name: "Dettagli di Un libro", exact: true }).click();
  await page.getByRole("button", { name: "Modifica regalo", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Modifica regalo", exact: true });
  await form.getByRole("textbox", { name: "Nome del regalo" }).fill("Modifica da conservare");
  await form.getByRole("button", { name: "Salva regalo" }).click();
  await expect(form.getByRole("alert")).toContainText("Non siamo riusciti a salvare il regalo");
  await expect(form.getByRole("textbox", { name: "Nome del regalo" })).toHaveValue("Modifica da conservare");
  page.once("dialog", prompt => prompt.dismiss());
  await form.getByRole("button", { name: "Chiudi", exact: true }).click();
  await expect(form).toBeVisible();
  page.once("dialog", prompt => prompt.accept());
  await form.getByRole("button", { name: "Chiudi", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Un libro", exact: true })).toBeVisible();
  await expect(page.locator(".gift-card")).toHaveCount(2);
});

test("eliminazione richiede conferma e aggiorna lista e conteggio", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Dettagli di Un libro", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Un libro", exact: true });
  await detail.getByRole("button", { name: "Elimina", exact: true }).click();
  await expect(detail.getByRole("heading", { name: "Eliminare questo regalo?" })).toBeVisible();
  await detail.getByRole("button", { name: "Annulla", exact: true }).click();
  await expect(detail.getByRole("heading", { name: "Eliminare questo regalo?" })).toHaveCount(0);
  await expect(page.locator(".gift-card")).toHaveCount(2);
  await detail.getByRole("button", { name: "Elimina", exact: true }).click();
  await detail.getByRole("button", { name: "Elimina regalo", exact: true }).click();
  await expect(detail).toHaveCount(0);
  await expect(page.locator(".gift-card")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Dettagli di Un libro", exact: true })).toHaveCount(0);
  await expect(page.locator(".detail-meta")).toContainText("1 desiderio");
  await expect(page.getByRole("button", { name: "Aggiungi regalo", exact: true })).toBeFocused();
});

test("eliminazione fallita lascia il regalo disponibile e permette di annullare", async ({ page }) => {
  await page.goto("/?delete-error");
  await page.getByRole("button", { name: "Dettagli di Un libro", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Un libro", exact: true });
  await detail.getByRole("button", { name: "Elimina", exact: true }).click();
  await detail.getByRole("button", { name: "Elimina regalo", exact: true }).click();
  await expect(detail.getByRole("alert")).toContainText("Non siamo riusciti a eliminare il regalo");
  await expect(page.locator(".gift-card")).toHaveCount(2);
  await detail.getByRole("button", { name: "Annulla", exact: true }).click();
  await expect(detail.getByRole("alert")).toHaveCount(0);
});

test("una lista archiviata mostra i regali senza azioni di modifica", async ({ page }) => {
  await page.goto("/?archived");
  await page.getByRole("button", { name: "Dettagli di Un libro", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Un libro", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Modifica regalo", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Elimina", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Aggiungi regalo", exact: true })).toHaveCount(0);
});

test("l’archiviazione richiede conferma e la riattivazione ripristina le azioni", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Archivia lista", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Archiviare questa lista?" });
  await expect(dialog).toContainText("prenotazioni restano conservati");
  await dialog.getByRole("button", { name: "Annulla", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveAttribute("data-archive-calls");
  await trigger.click();
  await dialog.getByRole("button", { name: "Conferma archiviazione" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("LISTA ARCHIVIATA", { exact: true })).toBeVisible();
  await expect(page.locator(".gift-card")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Aggiungi regalo", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Partecipanti", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Riattiva lista", exact: true }).click();
  await expect(trigger).toBeVisible();
  await expect(page.getByRole("button", { name: "Aggiungi regalo", exact: true })).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-archive-calls", "2");
});

test("archiviazione fallita conserva la lista e consente di annullare", async ({ page }) => {
  await page.goto("/?archive-error");
  await page.getByRole("button", { name: "Archivia lista", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Archiviare questa lista?" });
  await dialog.getByRole("button", { name: "Conferma archiviazione" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Non siamo riusciti ad archiviare");
  await expect(page.locator(".gift-card")).toHaveCount(2);
  await dialog.getByRole("button", { name: "Annulla", exact: true }).click();
  await expect(page.getByRole("button", { name: "Aggiungi regalo", exact: true })).toBeVisible();
});

test("riattivazione fallita mantiene lo stato archiviato", async ({ page }) => {
  await page.goto("/?archived&archive-error");
  await page.getByRole("button", { name: "Riattiva lista", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Non siamo riusciti a riattivare");
  await expect(page.getByText("LISTA ARCHIVIATA", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Riattiva lista", exact: true })).toBeEnabled();
});

test("i partecipanti non possono archiviare o riattivare la lista", async ({ page }) => {
  for (const query of ["participant", "participant&archived"]) {
    await page.goto(`/?${query}`);
    await expect(page.getByRole("heading", { name: "Compleanno", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^(Archivia lista|Riattiva lista)$/ })).toHaveCount(0);
  }
});
