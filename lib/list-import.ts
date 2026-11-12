import { categories, type Category, type Cover, type GiftLocation } from "./domain";
import { betaImportLimitMessage, betaLimits } from "./beta-limits";

export const maxListImportBytes = 512 * 1024;
export const maxListImportGifts = betaLimits.giftsPerList;

export type ImportedGift = {
  title: string; description: string; category: Category; currency: "EUR";
  priceCents?: number; priority: "normal" | "favorite"; locations: GiftLocation[];
};
export type ImportedList = {
  version: 1; title: string; description: string; date?: string; cover: Cover; gifts: ImportedGift[];
};

export class ListImportError extends Error {
  constructor(message: string, public field = "") { super(message); this.name = "ListImportError"; }
}

function object(value: unknown, field: string, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ListImportError("È richiesto un oggetto JSON.", field);
  const result = value as Record<string, unknown>;
  const unknown = Object.keys(result).find(key => !allowed.includes(key));
  if (unknown) throw new ListImportError("Questo campo non è supportato dal formato di importazione.", `${field}.${unknown}`);
  return result;
}

function string(value: unknown, field: string, max: number, required = false): string {
  if (value === undefined && !required) return "";
  if (typeof value !== "string") throw new ListImportError("È richiesto un testo.", field);
  const result = value.trim();
  if ((required && !result) || result.length > max) throw new ListImportError("Il testo è vuoto o supera la lunghezza consentita.", field);
  return result;
}

function choice<const T extends string>(value: unknown, field: string, allowed: readonly T[], fallback: T): T {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new ListImportError("Il valore non è tra quelli consentiti.", field);
  return value as T;
}

function location(value: unknown, field: string): GiftLocation {
  const data = object(value, field, ["kind", "url", "name", "address"]);
  if (data.kind === "online") {
    object(value, field, ["kind", "url"]);
    const raw = string(data.url, `${field}.url`, 2048, true);
    try {
      const url = new URL(raw);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
      return { kind: "online", url: url.href };
    } catch { throw new ListImportError("Inserisci un link http o https valido.", `${field}.url`); }
  }
  if (data.kind === "physical") {
    object(value, field, ["kind", "name", "address"]);
    return { kind: "physical", name: string(data.name, `${field}.name`, 150, true), ...(data.address === undefined ? {} : { address: string(data.address, `${field}.address`, 300) }) };
  }
  throw new ListImportError("Il valore non è tra quelli consentiti.", `${field}.kind`);
}

function gift(value: unknown, index: number): ImportedGift {
  const field = `gifts[${index}]`;
  const data = object(value, field, ["title", "description", "category", "currency", "priceCents", "priority", "locations"]);
  if (data.priceCents !== undefined && (typeof data.priceCents !== "number" || !Number.isSafeInteger(data.priceCents) || data.priceCents < 0 || data.priceCents > 100_000_000)) {
    throw new ListImportError("Il prezzo deve essere un numero intero di centesimi, tra 0 e 100000000.", `${field}.priceCents`);
  }
  const locations = data.locations === undefined ? [] : data.locations;
  if (!Array.isArray(locations) || locations.length > 5) throw new ListImportError("Puoi aggiungere fino a cinque luoghi di acquisto.", `${field}.locations`);
  return {
    title: string(data.title, `${field}.title`, 150, true),
    description: string(data.description, `${field}.description`, 3000),
    category: choice(data.category, `${field}.category`, Object.keys(categories) as Category[], "other"),
    currency: choice(data.currency, `${field}.currency`, ["EUR"], "EUR"),
    ...(data.priceCents === undefined ? {} : { priceCents: data.priceCents as number }),
    priority: choice(data.priority, `${field}.priority`, ["normal", "favorite"], "normal"),
    locations: locations.map((entry, index) => location(entry, `${field}.locations[${index}]`)),
  };
}

export function parseListImport(source: string): ImportedList {
  if (new TextEncoder().encode(source).byteLength > maxListImportBytes) throw new ListImportError("Il file supera il limite di 512 KB.");
  let value: unknown;
  try { value = JSON.parse(source.replace(/^\uFEFF/, "")); }
  catch { throw new ListImportError("Il file non contiene un JSON valido."); }
  const data = object(value, "$", ["version", "title", "description", "date", "cover", "gifts"]);
  if (data.version !== undefined && data.version !== 1) throw new ListImportError("Questa versione del formato non è supportata.", "version");
  if (!Array.isArray(data.gifts)) throw new ListImportError("Il campo gifts deve contenere un elenco di regali.", "gifts");
  if (data.gifts.length > maxListImportGifts) throw new ListImportError(betaImportLimitMessage, "gifts");
  let date: string | undefined;
  if (data.date !== undefined) {
    date = string(data.date, "date", 10, true);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new ListImportError("Inserisci una data valida.", "date");
  }
  return {
    version: 1, title: string(data.title, "title", 100, true), description: string(data.description, "description", 2000),
    ...(date ? { date } : {}), cover: choice(data.cover, "cover", ["plum", "sage", "sand"], "plum"), gifts: data.gifts.map(gift),
  };
}
