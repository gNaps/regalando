import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireParticipant } from "./lib/access";
import { requireGuest } from "./lib/guestAccess";
import { text } from "./lib/validation";

type Principal = { userId: Id<"users"> } | { guestSessionId: Id<"guestSessions">; guestName: string };
function isMine(reservation: Doc<"reservations">, principal: Principal) {
  return "userId" in principal ? reservation.userId === principal.userId : reservation.guestSessionId === principal.guestSessionId;
}
async function reserve(ctx: MutationCtx, gift: Doc<"gifts">, list: Doc<"lists">, expectedVersion: number, principal: Principal) {
  if (list.status !== "active" || gift.removed) throw new ConvexError("La lista o il regalo non sono disponibili per una nuova prenotazione.");
  const active = await ctx.db.query("reservations").withIndex("by_gift", q => q.eq("giftId", gift._id).eq("status", "active")).unique();
  if (active) {
    if (isMine(active, principal)) return active._id;
    throw new ConvexError("Questo regalo è appena stato prenotato da un’altra persona. Scegline un altro.");
  }
  if (gift.version !== expectedVersion) throw new ConvexError("Il regalo è cambiato. Riapri il dettaglio prima di prenotarlo.");
  const snapshot = { title: gift.title, description: gift.description, priceCents: gift.priceCents, currency: gift.currency, category: gift.category, priority: gift.priority, locations: gift.locations };
  return ctx.db.insert("reservations", { listId: list._id, giftId: gift._id, ...principal, status: "active", snapshot, giftVersion: gift.version, updatedAt: Date.now() });
}
async function cancel(ctx: MutationCtx, giftId: Id<"gifts">, principal: Principal) {
  const active = await ctx.db.query("reservations").withIndex("by_gift", q => q.eq("giftId", giftId).eq("status", "active")).unique();
  if (!active) return;
  if (!isMine(active, principal)) throw new ConvexError("Puoi annullare solo la tua prenotazione.");
  await ctx.db.patch(active._id, { status: "cancelled", updatedAt: Date.now() });
}

export const reserveGift = mutation({ args: { giftId: v.id("gifts"), expectedVersion: v.number() }, handler: async (ctx, { giftId, expectedVersion }) => {
  const gift = await ctx.db.get(giftId);
  if (!gift) throw new ConvexError("Regalo non disponibile.");
  const { user, list } = await requireParticipant(ctx, gift.listId);
  return reserve(ctx, gift, list, expectedVersion, { userId: user._id });
} });
export const cancelGift = mutation({ args: { giftId: v.id("gifts") }, handler: async (ctx, { giftId }) => {
  const gift = await ctx.db.get(giftId);
  if (!gift) throw new ConvexError("Regalo non disponibile.");
  const { user } = await requireParticipant(ctx, gift.listId);
  return cancel(ctx, giftId, { userId: user._id });
} });
export const reserveAsGuest = mutation({ args: { token: v.string(), secret: v.string(), giftId: v.id("gifts"), expectedVersion: v.number(), name: v.string() }, handler: async (ctx, { token, secret, giftId, expectedVersion, name }) => {
  const { guest, list } = await requireGuest(ctx, token, secret);
  if (!name.trim()) throw new ConvexError("Inserisci il tuo nome per prenotare.");
  const guestName = text(name, 80, true);
  const gift = await ctx.db.get(giftId);
  if (!gift || gift.listId !== list._id) throw new ConvexError("Regalo non disponibile.");
  return reserve(ctx, gift, list, expectedVersion, { guestSessionId: guest._id, guestName });
} });
export const cancelAsGuest = mutation({ args: { token: v.string(), secret: v.string(), giftId: v.id("gifts") }, handler: async (ctx, { token, secret, giftId }) => {
  const { guest, list } = await requireGuest(ctx, token, secret);
  const gift = await ctx.db.get(giftId);
  if (!gift || gift.listId !== list._id) throw new ConvexError("Regalo non disponibile.");
  return cancel(ctx, giftId, { guestSessionId: guest._id, guestName: "" });
} });
