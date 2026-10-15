import english from "./i18n/messages.en.json";

export const locales = ["it", "en"] as const;
export type Locale = typeof locales[number];
export const localeCookie = "regalando-locale";
export const localeCookieMaxAge = 60 * 60 * 24 * 365;
export const intlLocales: Record<Locale, string> = { it: "it-IT", en: "en-GB" };
const messages: Record<string, string> = english;

export function isLocale(value: unknown): value is Locale {
  return value === "it" || value === "en";
}

export function resolveLocale(cookie?: string, acceptLanguage = ""): Locale {
  if (isLocale(cookie)) return cookie;
  const preferences = acceptLanguage.split(",").map((entry, index) => {
    const [tag, ...options] = entry.trim().toLowerCase().split(";");
    const weight = options.find(option => option.trim().startsWith("q="));
    const quality = weight ? Number(weight.trim().slice(2)) : 1;
    return { language: tag.split("-")[0], quality, index };
  }).filter(value => Number.isFinite(value.quality) && value.quality > 0 && value.quality <= 1)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return preferences.find(value => isLocale(value.language))?.language as Locale ?? "it";
}

export function translate(locale: Locale, message: string, values: Record<string, string | number> = {}) {
  const text = locale === "en" && Object.hasOwn(messages, message) ? messages[message] : message;
  return text.replace(/\{(\w+)\}/g, (placeholder, key: string) => Object.hasOwn(values, key) ? String(values[key]) : placeholder);
}

export function translator(locale: Locale) {
  return (message: string, values?: Record<string, string | number>) => translate(locale, message, values);
}
