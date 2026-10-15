import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import english from "./i18n/messages.en.json";
import { resolveLocale, translate } from "./i18n";
import { formatDate, formatPrice } from "./domain";

describe("Scelta della lingua", () => {
  test("la scelta esplicita prevale sul browser e valori non supportati vengono ignorati", () => {
    expect(resolveLocale("it", "en-US,en;q=0.9")).toBe("it");
    expect(resolveLocale("en", "it-IT")).toBe("en");
    expect(resolveLocale("fr", "en-GB")).toBe("en");
    expect(resolveLocale(undefined, "de-DE, en-US;q=0.8, it;q=0.4")).toBe("en");
    expect(resolveLocale(undefined, "en;q=0.3,it-IT;q=0.9")).toBe("it");
    expect(resolveLocale(undefined, "en;q=0,it;q=0")).toBe("it");
    expect(resolveLocale(undefined, "en;q=invalid,fr")).toBe("it");
    expect(resolveLocale(undefined, "fr-FR")).toBe("it");
  });
});

describe("Traduzioni e formati", () => {
  test("interpola i valori senza tradurre o interpretare i contenuti degli utenti", () => {
    const title = "<script>Un libro {0}</script>";
    expect(translate("en", "Dettagli di {0}", { "0": title })).toBe(`Details of ${title}`);
    expect(translate("it", "Dettagli di {0}", { "0": title })).toBe(`Dettagli di ${title}`);
    expect(translate("en", "Un titolo scritto da me")).toBe("Un titolo scritto da me");
    for (const value of ["constructor", "toString", "__proto__"]) expect(translate("en", value)).toBe(value);
    expect(translate("en", "Dettagli di {0}")).toBe("Details of {0}");
  });
  test("localizza date e valuta mantenendo gli importi in euro", () => {
    const now = new Date("2026-10-13T12:00:00");
    expect(formatDate("2026-12-25", now, "it")).toBe("25 dicembre");
    expect(formatDate("2026-12-25", now, "en")).toBe("25 December");
    expect(formatDate(undefined, now, "en")).toBe("No deadline");
    expect(formatPrice(undefined, "en")).toBe("Price not specified");
    expect(formatPrice(125050, "en")).toBe("€1,250.50");
    expect(formatPrice(125050, "it")).toMatch(/1\.?250,50/);
  });
  test("ogni chiave usata nelle schermate e ogni errore backend ha una traduzione inglese", () => {
    const missing = new Set<string>();
    function inspect(directory: string) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = join(directory, entry.name);
        if (entry.isDirectory() && entry.name !== "_generated") { inspect(file); continue; }
        if (!/\.tsx?$/.test(file) || file.endsWith(".test.ts")) continue;
        const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
        function visit(node: ts.Node) {
          let value: ts.Expression | undefined;
          if (ts.isCallExpression(node) && node.expression.getText(source) === "t") value = node.arguments[0];
          if (ts.isNewExpression(node) && node.expression.getText(source) === "ConvexError") value = node.arguments?.[0];
          if (value && ts.isStringLiteral(value) && !Object.hasOwn(english, value.text)) missing.add(`${file}: ${value.text}`);
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
    inspect("app"); inspect("convex");
    expect([...missing]).toEqual([]);
  });
});
