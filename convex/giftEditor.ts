import { ConvexError, v } from "convex/values";
import { action, internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { giftFields } from "./schema";
import { createGift, updateGift, validateGift } from "./gifts";
import { requireActive, requireOwner } from "./lib/access";
import { adjustImageUsage, deleteImage, reserveImageUpload, validateImage } from "./lib/images";

const targetFields = { listId: v.id("lists"), giftId: v.optional(v.id("gifts")), expectedVersion: v.optional(v.number()) };
async function authorize(ctx: MutationCtx, args: { listId: Id<"lists">; giftId?: Id<"gifts">; expectedVersion?: number }) {
  const { list, user } = await requireOwner(ctx, args.listId);
  requireActive(list.status);
  const gift = args.giftId ? await ctx.db.get(args.giftId) : null;
  if (args.giftId && (!gift || gift.removed || gift.listId !== list._id)) throw new ConvexError("Regalo non disponibile.");
  if (gift && gift.version !== args.expectedVersion) throw new ConvexError("Il regalo è cambiato. Chiudi e riapri il dettaglio prima di riprovare.");
  return { gift, user };
}
export const prepare = internalMutation({
  args: { ...targetFields, ...giftFields, uploading: v.boolean() },
  handler: async (ctx, args) => {
    validateGift(args);
    const { user } = await authorize(ctx, args);
    if (args.uploading) await reserveImageUpload(ctx, user._id);
  },
});
export const persist = internalMutation({
  args: { ...targetFields, ...giftFields, imageId: v.optional(v.id("_storage")), removeImage: v.boolean() },
  handler: async (ctx, args) => {
    const { gift, user } = await authorize(ctx, args);
    const values = validateGift(args);
    const giftId = gift ? await updateGift(ctx, { ...values, giftId: gift._id, expectedVersion: args.expectedVersion! }) : await createGift(ctx, { ...values, listId: args.listId });
    if (args.imageId) {
      const metadata = await ctx.db.system.get(args.imageId);
      if (!metadata) throw new ConvexError("Immagine non disponibile.");
      const previous = gift?.imageId ? await ctx.db.system.get(gift.imageId) : null;
      await adjustImageUsage(ctx, user._id, metadata.size - (previous?.size ?? 0));
      if (gift?.imageId) await ctx.storage.delete(gift.imageId);
      await ctx.db.patch(giftId, { imageId: args.imageId });
    } else if (args.removeImage && gift?.imageId) {
      await deleteImage(ctx, user._id, gift.imageId);
      await ctx.db.patch(giftId, { imageId: undefined });
    }
    return giftId;
  },
});
export const save = action({
  args: { ...targetFields, ...giftFields, photo: v.optional(v.union(v.bytes(), v.null())) },
  handler: async (ctx, { photo, ...values }): Promise<Id<"gifts">> => {
    if (photo instanceof ArrayBuffer) validateImage(photo);
    await ctx.runMutation(internal.giftEditor.prepare, { ...values, uploading: photo instanceof ArrayBuffer });
    const imageId = photo instanceof ArrayBuffer ? await ctx.storage.store(new Blob([photo], { type: "image/jpeg" })) : undefined;
    try { return await ctx.runMutation(internal.giftEditor.persist, { ...values, imageId, removeImage: photo === null }); }
    catch (error) { if (imageId) await ctx.storage.delete(imageId); throw error; }
  },
});
