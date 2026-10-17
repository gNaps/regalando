// Reads the structured data shops publish for search engines and link previews
// (schema.org JSON-LD, Open Graph, plain <title>) and maps it onto gift fields.
// Everything here is pure and runs without the DOM or Node APIs, so it can be unit tested.

export type LinkPreview = {
  url: string;
  fetched: boolean;
  title?: string;
  description?: string;
  priceCents?: number;
  imageUrl?: string;
  siteName?: string;
};

export const titleLimit = 150;
export const descriptionLimit = 600;

const namedEntities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", euro: "€", ndash: "–", mdash: "—", laquo: "«", raquo: "»", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", agrave: "à", egrave: "è", eacute: "é", igrave: "ì", ograve: "ò", ugrave: "ù" };

export function decodeEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return namedEntities[entity.toLowerCase()] ?? match;
  });
}

function clean(value: string, limit: number) {
  // Decode first so double-encoded markup (common in CMS descriptions) is stripped as well.
  const text = decodeEntities(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text || undefined;
  const cut = text.slice(0, limit);
  const boundary = cut.lastIndexOf(" ");
  return (boundary > limit * 0.6 ? cut.slice(0, boundary) : cut).trim();
}

function attributes(tag: string) {
  const result: Record<string, string> = {};
  const pattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(tag))) result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  return result;
}

export function metaTags(html: string) {
  const tags = new Map<string, string>();
  for (const match of html.matchAll(/<meta\b([^>]*)>/gi)) {
    const attrs = attributes(match[1]);
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop)?.toLowerCase();
    if (!key || attrs.content === undefined || tags.has(key)) continue;
    tags.set(key, decodeEntities(attrs.content));
  }
  return tags;
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typeOf(node: JsonObject) {
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  return types.filter((entry): entry is string => typeof entry === "string").map(entry => entry.toLowerCase());
}

export function jsonLdProducts(html: string) {
  const products: JsonObject[] = [];
  function collect(value: JsonValue | undefined, depth = 0) {
    if (depth > 6) return;
    if (Array.isArray(value)) { for (const entry of value) collect(entry, depth + 1); return; }
    if (!isObject(value)) return;
    const types = typeOf(value);
    if (types.includes("product") || types.includes("individualproduct")) products.push(value);
    for (const key of ["@graph", "mainEntity", "itemListElement", "item", "hasVariant"]) if (key in value) collect(value[key], depth + 1);
  }
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { collect(JSON.parse(match[1].trim()) as JsonValue); } catch { /* malformed blocks are common; ignore them */ }
  }
  return products;
}

function firstString(value: JsonValue | undefined, depth = 0): string | undefined {
  if (depth > 3) return undefined;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) { for (const entry of value) { const found = firstString(entry, depth + 1); if (found) return found; } return undefined; }
  if (isObject(value)) return firstString(value.url ?? value.contentUrl ?? value.name ?? value["@value"], depth + 1);
  return undefined;
}

export function parsePrice(value: unknown): number | undefined {
  let cents: number | undefined;
  if (typeof value === "number") cents = Math.round(value * 100);
  else if (typeof value === "string") {
    const digits = value.replace(/[^\d.,]/g, "");
    if (!digits) return undefined;
    const lastComma = digits.lastIndexOf(",");
    const lastDot = digits.lastIndexOf(".");
    let integer = digits;
    let fraction = "";
    if (lastComma >= 0 && lastDot >= 0) {
      const separator = Math.max(lastComma, lastDot);
      integer = digits.slice(0, separator);
      fraction = digits.slice(separator + 1);
    } else if (lastComma >= 0 || lastDot >= 0) {
      const separator = Math.max(lastComma, lastDot);
      const tail = digits.slice(separator + 1);
      const repeated = digits.split(/[.,]/).length > 2;
      // "1.299" and "1,299" read as thousands; "45,5" and "45.00" read as decimals.
      if (!repeated && tail.length !== 3) { integer = digits.slice(0, separator); fraction = tail; }
    }
    integer = integer.replace(/[.,]/g, "");
    fraction = fraction.replace(/[.,]/g, "");
    if (!/^\d*$/.test(integer) || !/^\d*$/.test(fraction) || (!integer && !fraction)) return undefined;
    cents = Number(integer || "0") * 100 + Number((fraction + "00").slice(0, 2));
  }
  return cents !== undefined && Number.isSafeInteger(cents) && cents >= 0 && cents <= 100_000_000 ? cents : undefined;
}

function offerPrice(offers: JsonValue | undefined): { price?: number; currency?: string } {
  const list = Array.isArray(offers) ? offers : [offers];
  for (const offer of list) {
    if (!isObject(offer)) continue;
    const specifications = (Array.isArray(offer.priceSpecification) ? offer.priceSpecification : [offer.priceSpecification]).filter(isObject);
    // Prefer the price in force over list or strikethrough prices listed alongside it.
    const specification = specifications.find(entry => !/strikethrough|listprice/i.test(firstString(entry.priceType) ?? "")) ?? specifications[0];
    const raw = offer.price ?? offer.lowPrice ?? specification?.price;
    const price = parsePrice(raw);
    if (price === undefined) continue;
    const currency = firstString(offer.priceCurrency ?? specification?.priceCurrency);
    return { price, currency: currency?.toUpperCase() };
  }
  return {};
}

function stripSiteName(title: string | undefined, suffixes: (string | undefined)[]) {
  if (!title) return title;
  let result = title;
  for (const suffix of suffixes) {
    if (!suffix) continue;
    // Allow up to two trailing words after the site name ("- IKEA Italia", "| Bottega Shop Online").
    const pattern = new RegExp(`\\s*[|\\-–—:·»]\\s*${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s+\\S+){0,2}\\s*$`, "i");
    const stripped = result.replace(pattern, "").trim();
    if (stripped) result = stripped;
  }
  return result;
}

function hostLabel(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return undefined; }
}

const trackingParams = /^(utm_|mc_|_ga$|_gl$|fbclid$|gclid$|dclid$|msclkid$|yclid$|igshid$|srsltid$|spm$|ref$|ref_$|th$|psc$|pf_rd_|pd_rd_|linkcode$|tag$|ascsubtag$)/i;

export function cleanProductUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    if (/(^|\.)amazon\.[a-z.]+$/i.test(url.hostname)) {
      const asin = url.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?=[/?]|$)/i)?.[1];
      if (asin) return `${url.protocol}//${url.hostname}/dp/${asin.toUpperCase()}`;
    }
    for (const key of [...url.searchParams.keys()]) if (trackingParams.test(key)) url.searchParams.delete(key);
    return url.toString();
  } catch { return value; }
}

export function titleFromUrl(value: string) {
  try {
    const url = new URL(value);
    if (/(^|\.)amazon\.[a-z.]+$/i.test(url.hostname)) {
      const slug = url.pathname.match(/^\/(?:[a-z]{2}\/)?([^/]+)\/(?:dp|gp\/product)\//i)?.[1];
      if (slug && !/^(dp|gp)$/i.test(slug)) {
        const words = decodeURIComponent(slug).replace(/[-_+]+/g, " ").trim();
        if (words.length > 3) return clean(words, titleLimit);
      }
    }
    return undefined;
  } catch { return undefined; }
}

export function previewFromUrl(url: string): LinkPreview {
  return { url: cleanProductUrl(url), fetched: false, title: titleFromUrl(url) };
}

export function extractMetadata(html: string, url: string): LinkPreview {
  const meta = metaTags(html);
  const product = jsonLdProducts(html)[0];
  const siteName = clean(meta.get("og:site_name") ?? meta.get("application-name") ?? "", 80);
  const offer = product ? offerPrice(product.offers) : {};
  const metaCurrency = (meta.get("product:price:currency") ?? meta.get("og:price:currency"))?.toUpperCase();
  const metaPrice = parsePrice(meta.get("product:price:amount") ?? meta.get("og:price:amount"));
  let priceCents: number | undefined;
  if (offer.price !== undefined && (offer.currency ?? "EUR") === "EUR") priceCents = offer.price;
  else if (offer.price === undefined && metaPrice !== undefined && (metaCurrency ?? "EUR") === "EUR") priceCents = metaPrice;

  const rawTitle = firstString(product?.name) ?? meta.get("og:title") ?? meta.get("twitter:title") ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  // Shops append their own name or domain to the title ("… | Bottega", "… - Zalando.it"); both are removed.
  const title = clean(stripSiteName(rawTitle && clean(rawTitle, 1000), [siteName, hostLabel(url)]) ?? "", titleLimit) ?? titleFromUrl(url);
  const description = clean(firstString(product?.description) ?? meta.get("og:description") ?? meta.get("description") ?? meta.get("twitter:description") ?? "", descriptionLimit);
  const image = firstString(product?.image) ?? meta.get("og:image") ?? meta.get("og:image:url") ?? meta.get("twitter:image");
  let imageUrl: string | undefined;
  if (image) {
    try { const resolved = new URL(image.trim(), url); if (resolved.protocol === "https:" || resolved.protocol === "http:") imageUrl = resolved.toString(); } catch { /* ignore invalid image references */ }
  }
  return { url: cleanProductUrl(url), fetched: true, title, description, priceCents, imageUrl, siteName };
}
