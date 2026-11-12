import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { ListImportError, maxListImportBytes, parseListImport } from "./list-import";

const minimal = { title: "  Compleanno  ", gifts: [{ title: "  Cuffie  " }] };

describe("Importazione JSON", () => {
  test("normalizza il formato minimo e legge il file di esempio scaricabile", () => {
    expect(parseListImport(JSON.stringify(minimal))).toEqual({ version: 1, title: "Compleanno", description: "", cover: "plum", gifts: [{ title: "Cuffie", description: "", category: "other", currency: "EUR", priority: "normal", locations: [] }] });
    const example = parseListImport(readFileSync("public/examples/lista.json", "utf8"));
    expect(example.gifts).toHaveLength(2);
    expect(example.gifts[0]).toMatchObject({ priceCents: 12990, priority: "favorite", locations: [{ kind: "online" }] });
    expect(example.gifts[1]).toMatchObject({ category: "design", locations: [{ kind: "physical" }] });
  });

  test("accetta BOM, lista vuota, prezzo zero e data bisestile valida", () => {
    expect(parseListImport('\uFEFF{"title":"Vuota","gifts":[]}').gifts).toEqual([]);
    expect(parseListImport(JSON.stringify({ ...minimal, date: "2028-02-29", gifts: [{ title: "Gratis", priceCents: 0 }] }))).toMatchObject({ date: "2028-02-29", gifts: [{ priceCents: 0 }] });
  });

  test.each([
    ["not JSON", ""], ["null", "$"], ["[]", "$"],
    [JSON.stringify({ ...minimal, version: 2 }), "version"],
    [JSON.stringify({ ...minimal, title: " " }), "title"],
    [JSON.stringify({ ...minimal, title: "a".repeat(101) }), "title"],
    [JSON.stringify({ ...minimal, description: 3 }), "description"],
    [JSON.stringify({ ...minimal, date: "2027-02-29" }), "date"],
    [JSON.stringify({ ...minimal, date: null }), "date"],
    [JSON.stringify({ ...minimal, cover: "red" }), "cover"],
    [JSON.stringify({ title: "Lista" }), "gifts"],
    [JSON.stringify({ ...minimal, gifts: Array.from({ length: 16 }, () => ({ title: "Regalo" })) }), "gifts"],
    [JSON.stringify({ ...minimal, ownerId: "someone-else" }), "$.ownerId"],
    [JSON.stringify({ ...minimal, gifts: [{ title: "Regalo", _id: "existing" }] }), "gifts[0]._id"],
    [JSON.stringify({ ...minimal, gifts: [{ title: "Regalo", category: "constructor" }] }), "gifts[0].category"],
    [JSON.stringify({ ...minimal, gifts: [{ title: "Regalo", currency: "USD" }] }), "gifts[0].currency"],
    [JSON.stringify({ ...minimal, gifts: [{ title: "Regalo", priceCents: -1 }] }), "gifts[0].priceCents"],
    [JSON.stringify({ ...minimal, gifts: [{ title: "Regalo", priceCents: 12.99 }] }), "gifts[0].priceCents"],
    [JSON.stringify({ ...minimal, gifts: [{ title: "Regalo", priceCents: "100" }] }), "gifts[0].priceCents"],
    [JSON.stringify({ ...minimal, gifts: [{ title: "Regalo", locations: null }] }), "gifts[0].locations"],
    [JSON.stringify({ ...minimal, gifts: [{ title: "Regalo", locations: [{ kind: "online", url: "javascript:alert(1)" }] }] }), "gifts[0].locations[0].url"],
    [JSON.stringify({ ...minimal, gifts: [{ title: "Regalo", locations: [{ kind: "online", url: "https://user:pass@example.com" }] }] }), "gifts[0].locations[0].url"],
    [JSON.stringify({ ...minimal, gifts: [{ title: "Regalo", locations: [{ kind: "physical", name: " " }] }] }), "gifts[0].locations[0].name"],
  ])("rifiuta dati non validi e indica il campo: %s", (json, field) => {
    try { parseListImport(json); expect.fail("L’importazione doveva essere rifiutata"); }
    catch (error) { expect(error).toBeInstanceOf(ListImportError); expect((error as ListImportError).field).toBe(field); }
  });

  test("il limite considera i byte UTF-8, non solo il numero di caratteri", () => {
    const oversized = JSON.stringify({ ...minimal, description: "🎁".repeat(maxListImportBytes / 4) });
    expect(oversized.length).toBeLessThan(maxListImportBytes);
    expect(() => parseListImport(oversized)).toThrow("512 KB");
  });
});
