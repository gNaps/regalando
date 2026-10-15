import { expect, test, type Page } from "@playwright/test";

async function english(page: Page, path = "/") {
  await page.goto(path);
  await page.getByRole("combobox", { name: "Lingua", exact: true }).selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
}

test("la lingua resta dopo ricaricamento e navigazione, mentre i contenuti restano originali", async ({ page }) => {
  await english(page);
  await expect(page.getByRole("heading", { name: "Compleanno", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Archive list", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Books", exact: true })).toBeVisible();
  await expect(page.locator(".gift-card").first()).toContainText("Edizione illustrata");
  await expect(page.locator(".gift-card").first()).toContainText("€20");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Language", exact: true })).toHaveValue("en");
  await page.goto("/?screen=friends");
  await expect(page.getByRole("button", { name: "Shared with you", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("it");
  await expect(page.getByRole("button", { name: "Condivise con te", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "it");
});

test("il cambio lingua conserva un regalo nel modulo aperto", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Aggiungi regalo", exact: true }).click();
  await page.getByRole("textbox", { name: "Nome del regalo", exact: true }).fill("Un regalo mio");
  // The real selector lives outside the modal: change the same control programmatically.
  await page.getByRole("combobox", { name: "Lingua", exact: true }).selectOption("en", { force: true });
  const dialog = page.getByRole("dialog", { name: "New gift", exact: true });
  await expect(dialog.getByRole("textbox", { name: "Gift name", exact: true })).toHaveValue("Un regalo mio");
  await expect(dialog.getByRole("option", { name: "Home and design", exact: true })).toBeAttached();
  await dialog.getByRole("button", { name: "Add to list", exact: true }).click();
  await expect(page.getByRole("button", { name: "Un regalo mio", exact: true })).toBeVisible();
});

test("conferme di archivio e copia link sono tradotte", async ({ page }) => {
  await english(page, "/?with-link");
  await page.getByRole("button", { name: "Invite friends", exact: true }).click();
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => {} } }));
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(page.getByRole("button", { name: "Link copied", exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Link copied");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Archive list", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Archive this list?" })).toContainText("Gifts and reservations will be kept");
  await page.getByRole("button", { name: "Confirm archive", exact: true }).click();
  await expect(page.getByText("ARCHIVED LIST", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reactivate list", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add gift", exact: true })).toBeVisible();
});

test("accesso e relativi errori cambiano lingua senza perdere la destinazione", async ({ page }) => {
  await english(page, "/?auth=signin&redirect_url=%2Flists%2Ffesta");
  await expect(page.getByRole("button", { name: "Continue with Google", exact: true })).toBeVisible();
  await page.getByLabel("Email or username").fill("giulia@example.org");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Password", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Check your details");
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("it");
  await expect(page.getByRole("alert")).toContainText("Controlla i dati");
  await page.getByLabel("Password", { exact: true }).fill("valid-password");
  await page.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-destination", "/lists/festa");
});

test("l’ospite prenota e annulla in inglese", async ({ page }) => {
  await english(page, "/?screen=invite&guest");
  await page.getByRole("button", { name: "Continue as a guest", exact: true }).click();
  await expect(page.getByText("You're here as a guest", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Details of Un libro", exact: true }).click();
  await page.getByRole("button", { name: "Reserve gift", exact: true }).click();
  await page.getByLabel("Your name", { exact: true }).fill("Anna");
  await page.getByRole("button", { name: "Confirm reservation", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You're gifting this", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel reservation", exact: true }).click();
  await page.getByRole("button", { name: "Confirm cancellation", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reserve gift", exact: true })).toBeVisible();
});
