import { describe, expect, test } from "vitest";
import { formatDate, formatPrice, giftLocations, illustrationFor, plural, safeUrl, type GiftLocation } from "./domain";

describe("formattazione", () => {
  test("prezzi in euro, decimali solo se servono", () => {
    expect(formatPrice(undefined)).toBe("Prezzo libero");
    const price = (cents: number) => formatPrice(cents).replace(/\s/g, " ");
    expect(price(2000)).toBe("20 €");
    expect(price(4550)).toBe("45,50 €");
    expect(price(0)).toBe("0 €");
  });

  test("date con anno solo se diverso dall'anno corrente", () => {
    const now = new Date("2026-10-11T12:00:00");
    expect(formatDate(undefined, now)).toBe("Senza una scadenza");
    expect(formatDate("2026-12-24", now)).toBe("24 dicembre");
    expect(formatDate("2027-03-05", now)).toBe("5 marzo 2027");
  });

  test("singolare e plurale", () => {
    expect(plural(1, "desiderio", "desideri")).toBe("1 desiderio");
    expect(plural(0, "desiderio", "desideri")).toBe("0 desideri");
    expect(plural(3, "lista", "liste")).toBe("3 liste");
  });

  test("illustrazione per categoria", () => {
    expect(illustrationFor("books")).toBe("books");
    expect(illustrationFor("other")).toBe("gift");
  });
});

describe("link", () => {
  test("solo http e https senza credenziali", () => {
    expect(safeUrl("https://esempio.it/a")).toBe("https://esempio.it/a");
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("https://utente:segreto@esempio.it")).toBeUndefined();
    expect(safeUrl("non è un link")).toBeUndefined();
  });
});

test("modificare i luoghi principali conserva quelli aggiuntivi e gli indirizzi", () => {
  const existing: GiftLocation[] = [{ kind: "online", url: "https://example.com/old" }, { kind: "physical", name: "Libreria", address: "Milano" }, { kind: "online", url: "https://example.com/another" }, { kind: "physical", name: "Secondo negozio", address: "Roma" }];
  const gift = { title: "Libro", description: "", category: "books" as const, favorite: false, url: "https://example.com/new", shop: "Libreria", shopAddress: "Milano" };
  expect(giftLocations(gift, existing)).toEqual([{ kind: "online", url: gift.url }, ...existing.slice(1)]);
  expect(giftLocations({ ...gift, url: undefined, shop: undefined }, existing)).toEqual(existing.slice(2));
});
