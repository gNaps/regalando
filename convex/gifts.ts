import { v, ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { deleteImage } from "./lib/images";
import { giftFields } from "./schema";
import { requireOwner, requireActive } from "./lib/access";
import { text, validatePrice, validateUrl } from "./lib/validation";

type GiftValues = Pick<Doc<"gifts">, "title" | "description" | "priceCents" | "currency" | "category" | "priority" | "locations">;

export function validateGift(values: GiftValues): GiftValues {
  if (values.locations.length > 5) throw new ConvexError("Puoi aggiungere fino a cinque luoghi di acquisto.");
  return {
    title: text(values.title, 150, true),
    description: text(values.description, 3000),
    priceCents: validatePrice(values.priceCents),
    currency: values.currency,
    category: values.category,
    priority: values.priority,
    locations: values.locations.map(location => location.kind === "online"
      ? { ...location, url: validateUrl(location.url) }
      : { ...location, name: text(location.name, 150, true), address: location.address ? text(location.address, 300) : undefined }),
  };
}

async function ownedGift(ctx: MutationCtx, giftId: Id<"gifts">) {
  const gift = await ctx.db.get(giftId);
  if (!gift) throw new ConvexError("Regalo non disponibile.");
  // Ownership comes from the gift's stored listId, never from a client flag or listId.
  const { list } = await requireOwner(ctx, gift.listId);
  requireActive(list.status);
  return { gift, list };
}

function requireVersion(gift: Doc<"gifts">, expectedVersion: number) {
  if (gift.version !== expectedVersion) throw new ConvexError("Il regalo è cambiato. Chiudi e riapri il dettaglio prima di riprovare.");
}

function snapshot(gift: GiftValues): GiftValues {
  return { title: gift.title, description: gift.description, priceCents: gift.priceCents, currency: gift.currency, category: gift.category, priority: gift.priority, locations: gift.locations };
}

export async function createGift(ctx: MutationCtx, args: GiftValues & { listId: Id<"lists"> }) {
    const { list } = await requireOwner(ctx, args.listId);
    requireActive(list.status);
    const values = validateGift(args);
    const now = Date.now();
    const giftId = await ctx.db.insert("gifts", { listId: args.listId, ...values, version: 1, removed: false, updatedAt: now });
    const giftCount = list.giftCount ?? (await ctx.db.query("gifts").withIndex("by_list", q => q.eq("listId", list._id).eq("removed", false)).collect()).length - 1;
    await ctx.db.patch(list._id, { giftCount: giftCount + 1, updatedAt: now });
    return giftId;
}
export const create = mutation({ args: { listId: v.id("lists"), ...giftFields }, handler: createGift });

export async function updateGift(ctx: MutationCtx, args: GiftValues & { giftId: Id<"gifts">; expectedVersion: number }) {
    const { gift, list } = await ownedGift(ctx, args.giftId);
    if (gift.removed) throw new ConvexError("Regalo non disponibile.");
    requireVersion(gift, args.expectedVersion);
    const values = validateGift(args);
    const version = gift.version + 1;
    const now = Date.now();
    await ctx.db.patch(gift._id, { ...values, version, updatedAt: now });
    await ctx.db.patch(list._id, { updatedAt: now });
    const reservations = await ctx.db.query("reservations").withIndex("by_gift", q => q.eq("giftId", gift._id).eq("status", "active")).collect();
    for (const reservation of reservations) {
      await ctx.db.patch(reservation._id, { snapshot: values, giftVersion: version, updatedAt: now });
      await ctx.db.insert("notices", { userId: reservation.userId, guestSessionId: reservation.guestSessionId, reservationId: reservation._id, kind: "changed", version, previousSnapshot: reservation.snapshot });
    }
    // Same response whether the gift is reserved or not; no surprise data reaches the owner.
    return gift._id;
}
export const update = mutation({ args: { giftId: v.id("gifts"), expectedVersion: v.number(), ...giftFields }, handler: updateGift });

export const remove = mutation({
  args: { giftId: v.id("gifts"), expectedVersion: v.number() },
  handler: async (ctx, args) => {
    const { gift, list } = await ownedGift(ctx, args.giftId);
    // Retries must not decrement the counter or create notices a second time.
    if (gift.removed) return gift._id;
    requireVersion(gift, args.expectedVersion);
    const giftCount = list.giftCount ?? (await ctx.db.query("gifts").withIndex("by_list", q => q.eq("listId", list._id).eq("removed", false)).collect()).length;
    const version = gift.version + 1;
    const now = Date.now();
    await deleteImage(ctx, list.ownerId, gift.imageId);
    await ctx.db.patch(gift._id, { removed: true, imageId: undefined, version, updatedAt: now });
    await ctx.db.patch(list._id, { giftCount: Math.max(0, giftCount - 1), updatedAt: now });
    const reservations = await ctx.db.query("reservations").withIndex("by_gift", q => q.eq("giftId", gift._id).eq("status", "active")).collect();
    for (const reservation of reservations) {
      await ctx.db.patch(reservation._id, { status: "removed", snapshot: snapshot(gift), giftVersion: version, updatedAt: now });
      await ctx.db.insert("notices", { userId: reservation.userId, guestSessionId: reservation.guestSessionId, reservationId: reservation._id, kind: "removed", version });
    }
    return gift._id;
  },
});
