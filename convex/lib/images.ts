import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { IMAGE_MAX_BYTES, IMAGE_MAX_EDGE, IMAGE_TOTAL_QUOTA, IMAGE_USER_QUOTA } from "../../lib/image-limits";

// Read the actual JPEG frame, not a client-supplied MIME type or dimensions.
export function validateImage(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const invalid = () => { throw new ConvexError("Immagine non valida. Scegli un’altra foto."); };
  if (!bytes.length || bytes.length > IMAGE_MAX_BYTES) throw new ConvexError("L’immagine deve pesare al massimo 250 KB.");
  if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) return invalid();
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset++] !== 255) return invalid();
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 218 || marker === 217) break;
    const size = (bytes[offset] << 8) | bytes[offset + 1];
    if (size < 2 || offset + size > bytes.length) return invalid();
    if ([192, 193, 194].includes(marker)) {
      if (size < 8) return invalid();
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      if (!width || !height || Math.max(width, height) > IMAGE_MAX_EDGE) throw new ConvexError("L’immagine deve essere al massimo di 1200 pixel per lato.");
      return;
    }
    offset += size;
  }
  return invalid();
}

export async function adjustImageUsage(ctx: MutationCtx, ownerId: Id<"users">, delta: number) {
  for (const [key, limit] of [[String(ownerId), IMAGE_USER_QUOTA], ["global", IMAGE_TOTAL_QUOTA]] as const) {
    const usage = await ctx.db.query("imageUsage").withIndex("by_key", q => q.eq("key", key)).unique();
    const bytes = Math.max(0, (usage?.bytes ?? 0) + delta);
    if (delta > 0 && bytes > limit) throw new ConvexError(key === "global" ? "Lo spazio per le immagini è esaurito. Riprova più avanti." : "Hai raggiunto il limite di 10 MB di immagini. Rimuovi una foto prima di aggiungerne altre.");
    if (usage) await ctx.db.patch(usage._id, { bytes });
    else await ctx.db.insert("imageUsage", { key, bytes });
  }
}

export async function deleteImage(ctx: MutationCtx, ownerId: Id<"users">, imageId?: Id<"_storage">) {
  if (!imageId) return;
  const metadata = await ctx.db.system.get(imageId);
  if (metadata) { await adjustImageUsage(ctx, ownerId, -metadata.size); await ctx.storage.delete(imageId); }
}

export async function reserveImageUpload(ctx: MutationCtx, userId: Id<"users">) {
  const quota = await ctx.db.query("imageUploadQuota").withIndex("by_user", q => q.eq("userId", userId)).unique();
  const now = Date.now();
  const fresh = !quota || now - quota.windowStart >= 86400000;
  if (!fresh && quota.count >= 30) throw new ConvexError("Hai caricato molte immagini oggi. Riprova domani.");
  const values = { userId, windowStart: fresh ? now : quota.windowStart, count: fresh ? 1 : quota.count + 1 };
  if (quota) await ctx.db.patch(quota._id, values); else await ctx.db.insert("imageUploadQuota", values);
}
