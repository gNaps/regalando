"use node";

import { lookup } from "node:dns/promises";
import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { validateUrl } from "./lib/validation";
import { extractMetadata, previewFromUrl, type LinkPreview } from "./lib/linkMetadata";
import { isBlockedAddress, isBlockedHostname } from "./lib/hostGuard";

// Large shops (IKEA, Zalando) put the Product JSON-LD at the very end of pages above 1 MB.
const maxBytes = 3_000_000;
const timeoutMs = 5000;
const maxRedirects = 3;
const headers = {
  "user-agent": "Mozilla/5.0 (compatible; Regalando/1.0; +https://regalando.app) link-preview",
  accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
  "accept-language": "it-IT,it;q=0.9,en;q=0.6",
};

async function assertPublic(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("protocol");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isBlockedHostname(host)) throw new Error("blocked host");
  const addresses = await lookup(host, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(entry => isBlockedAddress(entry.address))) throw new Error("blocked address");
}

async function readLimited(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return undefined;
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (received < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  const buffer = new Uint8Array(Math.min(received, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const slice = chunk.subarray(0, Math.min(chunk.byteLength, buffer.byteLength - offset));
    buffer.set(slice, offset);
    offset += slice.byteLength;
    if (offset >= buffer.byteLength) break;
  }
  const charset = /charset=([\w-]+)/i.exec(response.headers.get("content-type") ?? "")?.[1];
  try { return new TextDecoder(charset ?? "utf-8").decode(buffer); } catch { return new TextDecoder().decode(buffer); }
}

async function download(start: string) {
  let url = new URL(start);
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublic(url);
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs), headers });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel().catch(() => undefined);
      const location = response.headers.get("location");
      if (!location) return undefined;
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) { await response.body?.cancel().catch(() => undefined); return undefined; }
    if (!/text\/html|application\/xhtml\+xml/i.test(response.headers.get("content-type") ?? "")) { await response.body?.cancel().catch(() => undefined); return undefined; }
    const html = await readLimited(response);
    return html === undefined ? undefined : { html, url: url.toString() };
  }
  return undefined;
}

// Reads the public metadata of a product page so the gift form can be prefilled.
// The result is a suggestion: nothing is written, and the caller keeps every field editable.
export const preview = action({
  args: { url: v.string() },
  handler: async (ctx, args): Promise<LinkPreview> => {
    const url = validateUrl(args.url);
    await ctx.runMutation(internal.previewQuota.reserve, {});
    try {
      const page = await download(url);
      if (!page) return previewFromUrl(url);
      return extractMetadata(page.html, page.url);
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      // Network failures, blocked hosts and bot walls all degrade to the URL-only suggestion.
      return previewFromUrl(url);
    }
  },
});
