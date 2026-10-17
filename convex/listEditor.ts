import { ConvexError, v } from "convex/values";
import { action, internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireActive, requireOwner, requireUser } from "./lib/access";
import { text, validateDate } from "./lib/validation";
import { adjustImageUsage, deleteImage, reserveImageUpload, validateImage } from "./lib/images";

const fields = {
  listId: v.optional(v.id("lists")), title: v.string(), description: v.string(),
  date: v.optional(v.string()), cover: v.union(v.literal("plum"), v.literal("sage"), v.literal("sand")),
};
type Values = { listId?: Id<"lists">; title: string; description: string; date?: string; cover: "plum" | "sage" | "sand" };
function validate(values: Values) {
  return { title: text(values.title, 100, true), description: text(values.description, 2000), date: validateDate(values.date), cover: values.cover };
}
async function authorize(ctx: MutationCtx, listId?: Id<"lists">) {
  if (!listId) return { user: await requireUser(ctx), list: null };
  const { user, list } = await requireOwner(ctx, listId);
  requireActive(list.status);
  return { user, list };
}
export const prepare = internalMutation({
  args: { ...fields, uploading: v.boolean() },
  handler: async (ctx, args) => {
    validate(args);
    const { user } = await authorize(ctx, args.listId);
    if (args.uploading) await reserveImageUpload(ctx, user._id);
  },
});

// Metadata and photo reference change in a single transaction. If either fails,
// the form can retry without creating a duplicate list or partially editing it.
export const persist = internalMutation({
  args: { ...fields, imageId: v.optional(v.id("_storage")), removeImage: v.boolean() },
  handler: async (ctx, args) => {
    const values = validate(args);
    const { user, list } = await authorize(ctx, args.listId);
    const photoChanged = Boolean(args.imageId || args.removeImage);
    if (args.imageId) {
      const metadata = await ctx.db.system.get(args.imageId);
      if (!metadata) throw new ConvexError("Immagine non disponibile.");
      const old = list?.imageId ? await ctx.db.system.get(list.imageId) : null;
      await adjustImageUsage(ctx, user._id, metadata.size - (old?.size ?? 0));
      if (list?.imageId) await ctx.storage.delete(list.imageId);
    } else if (args.removeImage && list?.imageId) await deleteImage(ctx, user._id, list.imageId);
    if (list) {
      await ctx.db.patch(list._id, { ...values, ...(photoChanged ? { imageId: args.imageId } : {}), updatedAt: Date.now() });
      return list._id;
    }
    return ctx.db.insert("lists", { ownerId: user._id, ...values, imageId: args.imageId, status: "active", giftCount: 0, updatedAt: Date.now() });
  },
});

export const save = action({
  args: { ...fields, photo: v.optional(v.union(v.bytes(), v.null())) },
  handler: async (ctx, { photo, ...values }): Promise<Id<"lists">> => {
    if (photo instanceof ArrayBuffer) validateImage(photo);
    await ctx.runMutation(internal.listEditor.prepare, { ...values, uploading: photo instanceof ArrayBuffer });
    const imageId = photo instanceof ArrayBuffer ? await ctx.storage.store(new Blob([photo], { type: "image/jpeg" })) : undefined;
    try { return await ctx.runMutation(internal.listEditor.persist, { ...values, imageId, removeImage: photo === null }); }
    catch (error) { if (imageId) await ctx.storage.delete(imageId); throw error; }
  },
});
