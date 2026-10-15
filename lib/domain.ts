import { intlLocales, translate, type Locale } from "./i18n";

export const giftCategories = {
  design: "Casa e design",
  tech: "Tecnologia",
  gaming: "Console e videogames",
  music: "Musica",
  art: "Arte",
  travel: "Viaggi",
  style: "Fashion e stile",
  beauty: "Beauty",
  experiences: "Experience",
  other: "Altro",
} as const;

// Keep existing book wishes readable without offering the old category for new ones.
export const categories = { ...giftCategories, books: "Libri" } as const;

export type Category = keyof typeof categories;
export type Cover = "plum" | "sage" | "sand";
export type Illustration = "books" | "phone" | "controller" | "headphones" | "vase" | "art" | "suitcase" | "bag" | "perfume" | "experience" | "gift";
export type Gift = {
  id: string; title: string; description: string; priceCents?: number;
  category: Category; favorite: boolean; url?: string; shop?: string; shopAddress?: string;
};
export type GiftLocation = { kind: "online"; url: string } | { kind: "physical"; name: string; address?: string };

export function giftLocations(gift: Omit<Gift, "id">, existing: GiftLocation[] = []): GiftLocation[] {
  const locations: GiftLocation[] = [];
  let online = false;
  let physical = false;
  for (const location of existing) {
    if (location.kind === "online" && !online) {
      online = true;
      if (gift.url) locations.push({ kind: "online", url: gift.url });
    } else if (location.kind === "physical" && !physical) {
      physical = true;
      if (gift.shop) locations.push({ kind: "physical", name: gift.shop, address: gift.shopAddress });
    } else locations.push(location);
  }
  if (!online && gift.url) locations.push({ kind: "online", url: gift.url });
  if (!physical && gift.shop) locations.push({ kind: "physical", name: gift.shop, address: gift.shopAddress });
  return locations;
}
export type WishList = {
  id: string; title: string; description: string; date?: string; owner: string;
  cover: Cover; archived: boolean; gifts: Gift[];
};

const categoryIllustrations: Record<Category, Illustration> = {
  design: "vase", tech: "phone", gaming: "controller", music: "headphones", art: "art", travel: "suitcase", style: "bag", beauty: "perfume", books: "books", experiences: "experience", other: "gift",
};

export function illustrationFor(category: Category): Illustration {
  return categoryIllustrations[category];
}

export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function formatPrice(cents?: number, locale: Locale = "it") {
  return cents === undefined ? translate(locale, "Prezzo libero") : new Intl.NumberFormat(intlLocales[locale], { style: "currency", currency: "EUR", maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

export function formatDate(date?: string, now = new Date(), locale: Locale = "it") {
  if (!date) return translate(locale, "Senza una scadenza");
  const value = new Date(`${date}T12:00:00`);
  const sameYear = value.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(intlLocales[locale], { day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) }).format(value);
}

export function safeUrl(value: string) {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined; }
  catch { return undefined; }
}
