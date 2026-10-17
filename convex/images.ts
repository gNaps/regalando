import { ConvexError, v } from "convex/values";
import { action, internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireOwner, requireActive } from "./lib/access";
import { adjustImageUsage, deleteImage, reserveImageUpload, validateImage } from "./lib/images";
import type { Id } from "./_generated/dataModel";

const targetFields = { listId: v.id("lists"), giftId: v.optional(v.id("gifts")) };
type Target = { listId: Id<"lists">; giftId?: Id<"gifts"> };
async function ownedTarget(ctx: MutationCtx, target: Target) {
  const { list, user } = await requireOwner(ctx, target.listId);
  requireActive(list.status);
  const gift = target.giftId ? await ctx.db.get(target.giftId) : null;
  if (target.giftId && (!gift || gift.listId !== list._id || gift.removed)) throw new ConvexError("Regalo non disponibile.");
  return { user, document: gift ?? list };
}

export const authorize = internalMutation({ args: targetFields, handler: async (ctx, target) => {
  const { user } = await ownedTarget(ctx, target);
  await reserveImageUpload(ctx, user._id);
} });

export const attach = internalMutation({ args: { ...targetFields, imageId: v.id("_storage") }, handler: async (ctx, args) => {
  const { user, document } = await ownedTarget(ctx, args);
  const metadata = await ctx.db.system.get(args.imageId);
  if (!metadata) throw new ConvexError("Immagine non disponibile.");
  const previous = document.imageId ? await ctx.db.system.get(document.imageId) : null;
  await adjustImageUsage(ctx, user._id, metadata.size - (previous?.size ?? 0));
  await ctx.db.patch(document._id, { imageId: args.imageId, updatedAt: Date.now() });
  if (document.imageId) await ctx.storage.delete(document.imageId);
} });

export const upload = action({ args: { ...targetFields, bytes: v.bytes() }, handler: async (ctx, { bytes, ...target }): Promise<void> => {
  validateImage(bytes);
  await ctx.runMutation(internal.images.authorize, target);
  const imageId = await ctx.storage.store(new Blob([bytes], { type: "image/jpeg" }));
  try { await ctx.runMutation(internal.images.attach, { ...target, imageId }); }
  catch (error) { await ctx.storage.delete(imageId); throw error; }
} });

export const remove = mutation({ args: targetFields, handler: async (ctx, target) => {
  const { user, document } = await ownedTarget(ctx, target);
  await deleteImage(ctx, user._id, document.imageId);
  await ctx.db.patch(document._id, { imageId: undefined, updatedAt: Date.now() });
} });
