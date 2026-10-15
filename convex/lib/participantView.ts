import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export async function participantView(ctx: QueryCtx, list: Doc<"lists">, viewer: { userId?: Id<"users">; guestSessionId?: Id<"guestSessions"> }) {
  const owner = await ctx.db.get(list.ownerId);
  const gifts = await ctx.db.query("gifts").withIndex("by_list", q => q.eq("listId", list._id).eq("removed", false)).collect();
  const visibleGifts = await Promise.all(gifts.map(async gift => {
    const reservation = await ctx.db.query("reservations").withIndex("by_gift", q => q.eq("giftId", gift._id).eq("status", "active")).unique();
    const bookedBy = reservation?.userId ? await ctx.db.get(reservation.userId) : null;
    const mine = Boolean(reservation && (viewer.userId && reservation.userId === viewer.userId || viewer.guestSessionId && reservation.guestSessionId === viewer.guestSessionId));
    return { ...gift, reservation: reservation ? { mine, name: reservation.guestName || bookedBy?.name || "Un amico" } : null };
  }));
  return { title: list.title, description: list.description, date: list.date, status: list.status, cover: list.cover, ownerName: owner?.name ?? "Un amico", gifts: visibleGifts };
}
