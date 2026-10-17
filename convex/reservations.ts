import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireParticipant } from "./lib/access";
import { requireGuest } from "./lib/guestAccess";
import { text, validatePrice } from "./lib/validation";

type Principal = { userId: Id<"users"> } | { guestSessionId: Id<"guestSessions">; guestName: string };
function isMine(reservation: Doc<"reservations">, principal: Principal) {
  return "userId" in principal ? reservation.userId === principal.userId : reservation.guestSessionId === principal.guestSessionId;
}
function activeReservations(ctx: MutationCtx, giftId: Id<"gifts">) {
  return ctx.db.query("reservations").withIndex("by_gift", q => q.eq("giftId", giftId).eq("status", "active")).collect();
}
type ReserveOptions = { amountCents?: number; group?: boolean };
// Whether a gift is shared is decided by the friends, never by the list owner:
// the first person to choose it either keeps it for themselves or opens it to the group.
async function reserve(ctx: MutationCtx, gift: Doc<"gifts">, list: Doc<"lists">, expectedVersion: number, principal: Principal, options: ReserveOptions = {}) {
  if (list.status !== "active" || gift.removed) throw new ConvexError("La lista o il regalo non sono disponibili per una nuova prenotazione.");
  const active = await activeReservations(ctx, gift._id);
  const mine = active.find(reservation => isMine(reservation, principal));
  const others = active.filter(reservation => reservation !== mine);
  const now = Date.now();
  if (mine) {
    // Confirming again is idempotent. The initiator can open their reservation to the group,
    // go back to a solo gift only while nobody else has joined, and update the declared share.
    const group = options.group === undefined ? Boolean(mine.group) || others.length > 0 : options.group || others.length > 0;
    const amountCents = group ? validatePrice(options.amountCents) : undefined;
    const guestName = "guestName" in principal && principal.guestName ? principal.guestName : undefined;
    if (group !== Boolean(mine.group) || amountCents !== mine.amountCents || (guestName && guestName !== mine.guestName)) await ctx.db.patch(mine._id, { group, amountCents, ...(guestName ? { guestName } : {}), updatedAt: now });
    return mine._id;
  }
  const open = others.some(reservation => reservation.group);
  if (others.length > 0 && !open) throw new ConvexError("Questo regalo è appena stato prenotato da un’altra persona. Scegline un altro.");
  if (gift.version !== expectedVersion) throw new ConvexError("Il regalo è cambiato. Riapri il dettaglio prima di prenotarlo.");
  const group = open || Boolean(options.group);
  const snapshot = { title: gift.title, description: gift.description, priceCents: gift.priceCents, currency: gift.currency, category: gift.category, priority: gift.priority, locations: gift.locations };
  return ctx.db.insert("reservations", { listId: list._id, giftId: gift._id, ...principal, group, amountCents: group ? validatePrice(options.amountCents) : undefined, status: "active", snapshot, giftVersion: gift.version, updatedAt: now });
}
async function cancel(ctx: MutationCtx, giftId: Id<"gifts">, principal: Principal) {
  const active = await activeReservations(ctx, giftId);
  if (active.length === 0) return;
  const mine = active.find(reservation => isMine(reservation, principal));
  if (!mine) throw new ConvexError("Puoi annullare solo la tua prenotazione.");
  await ctx.db.patch(mine._id, { status: "cancelled", updatedAt: Date.now() });
}

export const reserveGift = mutation({ args: { giftId: v.id("gifts"), expectedVersion: v.number(), amountCents: v.optional(v.number()), group: v.optional(v.boolean()) }, handler: async (ctx, { giftId, expectedVersion, amountCents, group }) => {
  const gift = await ctx.db.get(giftId);
  if (!gift) throw new ConvexError("Regalo non disponibile.");
  const { user, list } = await requireParticipant(ctx, gift.listId);
  return reserve(ctx, gift, list, expectedVersion, { userId: user._id }, { amountCents, group });
} });
export const cancelGift = mutation({ args: { giftId: v.id("gifts") }, handler: async (ctx, { giftId }) => {
  const gift = await ctx.db.get(giftId);
  if (!gift) throw new ConvexError("Regalo non disponibile.");
  const { user } = await requireParticipant(ctx, gift.listId);
  return cancel(ctx, giftId, { userId: user._id });
} });
export const reserveAsGuest = mutation({ args: { token: v.string(), secret: v.string(), giftId: v.id("gifts"), expectedVersion: v.number(), name: v.string(), amountCents: v.optional(v.number()), group: v.optional(v.boolean()) }, handler: async (ctx, { token, secret, giftId, expectedVersion, name, amountCents, group }) => {
  const { guest, list } = await requireGuest(ctx, token, secret);
  if (!name.trim()) throw new ConvexError("Inserisci il tuo nome per prenotare.");
  const guestName = text(name, 80, true);
  const gift = await ctx.db.get(giftId);
  if (!gift || gift.listId !== list._id) throw new ConvexError("Regalo non disponibile.");
  return reserve(ctx, gift, list, expectedVersion, { guestSessionId: guest._id, guestName }, { amountCents, group });
} });
export const cancelAsGuest = mutation({ args: { token: v.string(), secret: v.string(), giftId: v.id("gifts") }, handler: async (ctx, { token, secret, giftId }) => {
  const { guest, list } = await requireGuest(ctx, token, secret);
  const gift = await ctx.db.get(giftId);
  if (!gift || gift.listId !== list._id) throw new ConvexError("Regalo non disponibile.");
  return cancel(ctx, giftId, { guestSessionId: guest._id, guestName: "" });
} });
