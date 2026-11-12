import { expect, test, type Locator, type Page } from "@playwright/test";

const minimal = { title: "Lista da JSON", description: "Una lista importata", gifts: [{ title: "Cuffie nuove", category: "tech", priceCents: 12990 }] };
async function upload(dialog: Locator, content: string, name = "lista.json") {
  await dialog.getByLabel("File JSON", { exact: true }).setInputFiles({ name, mimeType: "application/json", buffer: Buffer.from(content) });
}

async function openImport(page: Page) {
  await expect(page.getByRole("button", { name: "Importa JSON", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Crea una lista", exact: true }).first().click();
  await page.getByRole("dialog", { name: "Nuova lista", exact: true }).getByRole("button", { name: "Importa JSON", exact: true }).click();
}

test("anteprima senza salvataggio, conferma e apertura della nuova lista", async ({ page }) => {
  await page.goto("/?screen=lists&below-list-limit&empty-lists");
  await openImport(page);
  const dialog = page.getByRole("dialog", { name: "Importa una lista", exact: true });
  const confirm = dialog.getByRole("button", { name: "Importa e crea la lista", exact: true });
  await expect(confirm).toBeDisabled();
  await expect(dialog.getByRole("link", { name: "Scarica il JSON di esempio" })).toHaveAttribute("href", "/examples/lista.json");
  await upload(dialog, JSON.stringify(minimal));
  const preview = dialog.getByRole("region", { name: "Anteprima dell’importazione" });
  await expect(preview.getByRole("heading", { name: minimal.title })).toBeVisible();
  await expect(preview).toContainText("Cuffie nuove");
  await expect(preview).toContainText("129,90");
  await expect(page.locator("body")).not.toHaveAttribute("data-import-attempts");
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await confirm.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("body")).toHaveAttribute("data-import-attempts", "1");
  await expect(page.locator("body")).toHaveAttribute("data-destination", "/lists/fixture-list");
  const imported = JSON.parse((await page.locator("body").getAttribute("data-imported-list"))!);
  expect(imported).toMatchObject({ title: minimal.title, gifts: [{ title: "Cuffie nuove", currency: "EUR", priceCents: 12990, priority: "normal" }] });
});

test("un file non valido non viene inviato e può essere sostituito", async ({ page }) => {
  await page.goto("/?screen=lists&below-list-limit");
  await openImport(page);
  const dialog = page.getByRole("dialog", { name: "Importa una lista", exact: true });
  const confirm = dialog.getByRole("button", { name: "Importa e crea la lista", exact: true });
  await upload(dialog, "{invalido");
  await expect(dialog.getByRole("alert")).toContainText("JSON valido");
  await expect(confirm).toBeDisabled();
  await upload(dialog, JSON.stringify({ ...minimal, gifts: [{ title: "Cuffie", priceCents: -1 }] }));
  await expect(dialog.getByRole("alert")).toContainText("gifts[0].priceCents");
  await expect(confirm).toBeDisabled();
  await expect(page.locator("body")).not.toHaveAttribute("data-import-attempts");
  await upload(dialog, JSON.stringify(minimal));
  await expect(confirm).toBeEnabled();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await upload(dialog, " ".repeat(512 * 1024 + 1));
  await expect(dialog.getByRole("alert")).toContainText("512 KB");
  await expect(confirm).toBeDisabled();
  await expect(dialog.getByRole("region")).toHaveCount(0);
});

test("un errore di salvataggio conserva l’anteprima e consente di riprovare", async ({ page }) => {
  await page.goto("/?screen=lists&below-list-limit&import-error-once");
  await openImport(page);
  const dialog = page.getByRole("dialog", { name: "Importa una lista", exact: true });
  await upload(dialog, JSON.stringify(minimal));
  const confirm = dialog.getByRole("button", { name: "Importa e crea la lista", exact: true });
  await confirm.click();
  await expect(dialog.getByRole("alert")).toContainText("Il file è ancora pronto");
  await expect(dialog.getByRole("heading", { name: minimal.title })).toBeVisible();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.locator("body")).toHaveAttribute("data-import-attempts", "2");
  await expect(page.locator("body")).toHaveAttribute("data-destination", "/lists/fixture-list");
});

test("chiudere l’importazione non salva dati e ripristina il focus", async ({ page }) => {
  await page.goto("/?screen=lists&below-list-limit");
  const trigger = page.getByRole("button", { name: "Crea una lista", exact: true }).first();
  await openImport(page);
  const dialog = page.getByRole("dialog", { name: "Importa una lista", exact: true });
  await upload(dialog, JSON.stringify(minimal));
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveAttribute("data-import-attempts");
});
