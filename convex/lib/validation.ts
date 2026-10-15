import { ConvexError } from "convex/values";

export function text(value: string, max: number, required = false) {
  const result = value.trim();
  if ((required && !result) || result.length > max) throw new ConvexError("Controlla la lunghezza dei campi inseriti.");
  return result;
}

export function validateDate(value?: string) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new ConvexError("Inserisci una data valida.");
  return value;
}

export function validatePrice(price?: number) {
  if (price !== undefined && (!Number.isSafeInteger(price) || price < 0 || price > 100_000_000)) throw new ConvexError("Inserisci un prezzo valido.");
  return price;
}

export function validateUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || value.length > 2048) throw new Error();
    return url.toString();
  } catch { throw new ConvexError("Inserisci un link http o https valido."); }
}
