import { expect, test } from "@playwright/test";

test("tre liste incluse le archiviate bloccano la creazione e spiegano il piano gratuito", async ({ page }) => {
  await page.goto("/?screen=lists&list-limit");
  await expect(page.getByRole("button", { name: "Crea una lista", exact: true })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("3 liste per account, incluse quelle archiviate");
  await expect(page.getByRole("status")).toContainText("piano gratuito durante la fase beta");
  await page.getByRole("button", { name: "Archiviate", exact: false }).click();
  await expect(page.getByRole("button", { name: "Crea una lista", exact: true })).toBeDisabled();
  await page.getByRole("combobox", { name: "Lingua", exact: true }).selectOption("en");
  await expect(page.getByRole("status")).toContainText("free plan limit during the beta");
});

test("i filtri non aggirano il limite di 15 regali e le modifiche restano possibili", async ({ page }) => {
  await page.goto("/?gift-limit");
  await expect(page.getByRole("button", { name: "Aggiungi regalo", exact: true })).toBeDisabled();
  await expect(page.locator("#gift-create-limit")).toContainText("15 regali per lista");
  await expect(page.locator("#gift-create-limit")).toContainText("piano gratuito durante la fase beta");
  await page.getByRole("button", { name: "Libri", exact: true }).click();
  await expect(page.locator(".gift-card")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Aggiungi regalo", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Un libro", exact: true }).click();
  await page.getByRole("button", { name: "Modifica regalo", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Modifica regalo", exact: true });
  await form.getByLabel("Nome del regalo").fill("Libro aggiornato");
  await expect(form.getByRole("button", { name: "Salva regalo", exact: true })).toBeEnabled();
  await form.getByRole("button", { name: "Salva regalo", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Libro aggiornato", exact: true });
  await detail.getByRole("button", { name: "Elimina", exact: true }).click();
  await detail.getByRole("button", { name: "Elimina regalo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Aggiungi regalo", exact: true })).toBeEnabled();
  await expect(page.locator("#gift-create-limit")).toHaveCount(0);
});

test("aggiungere il quindicesimo regalo disabilita subito nuove creazioni", async ({ page }) => {
  await page.goto("/?near-gift-limit");
  await page.getByRole("button", { name: "Aggiungi regalo", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nuovo regalo", exact: true });
  await dialog.getByLabel("Nome del regalo").fill("Quindicesimo regalo");
  await dialog.getByRole("button", { name: "Aggiungi alla lista", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".gift-card")).toHaveCount(15);
  await expect(page.getByRole("button", { name: "Aggiungi regalo", exact: true })).toBeDisabled();
  await expect(page.locator("#gift-create-limit")).toBeVisible();
});

test("importare più di 15 regali spiega il limite beta e blocca il salvataggio", async ({ page }) => {
  await page.goto("/?screen=lists&below-list-limit");
  await page.getByRole("button", { name: "Crea una lista", exact: true }).first().click();
  await page.getByRole("button", { name: "Importa JSON", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Importa una lista", exact: true });
  await dialog.getByLabel("File JSON", { exact: true }).setInputFiles({
    name: "lista.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ title: "Troppi regali", gifts: Array.from({ length: 16 }, () => ({ title: "Regalo" })) })),
  });
  await expect(dialog.getByRole("alert")).toContainText("piano gratuito consente al massimo 15 regali per lista");
  await expect(dialog.getByRole("button", { name: "Importa e crea la lista", exact: true })).toBeDisabled();
  await expect(page.locator("body")).not.toHaveAttribute("data-import-attempts");
});
