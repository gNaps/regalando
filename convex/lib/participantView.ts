import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

type Viewer = { userId?: Id<"users">; guestSessionId?: Id<"guestSessions"> };

export function isViewer(reservation: { userId?: Id<"users">; guestSessionId?: Id<"guestSessions"> }, viewer: Viewer) {
  return Boolean(viewer.userId && reservation.userId === viewer.userId || viewer.guestSessionId && reservation.guestSessionId === viewer.guestSessionId);
}

export async function participantView(ctx: QueryCtx, list: Doc<"lists">, viewer: Viewer) {
  const owner = await ctx.db.get(list.ownerId);
  const gifts = await ctx.db.query("gifts").withIndex("by_list", q => q.eq("listId", list._id).eq("removed", false)).collect();
  const visibleGifts = await Promise.all(gifts.map(async gift => {
    const active = await ctx.db.query("reservations").withIndex("by_gift", q => q.eq("giftId", gift._id).eq("status", "active")).collect();
    const participants = await Promise.all(active.map(async reservation => {
      const account = reservation.userId ? await ctx.db.get(reservation.userId) : null;
      return { mine: isViewer(reservation, viewer), name: reservation.guestName || account?.name || "Un amico", amountCents: reservation.amountCents };
    }));
    // Group mode is proposed by the friends themselves; the owner's gift document never carries it.
    const group = active.some(reservation => reservation.group) || participants.length > 1;
    const noteCount = (await ctx.db.query("giftNotes").withIndex("by_gift", q => q.eq("giftId", gift._id)).collect()).length;
    const single = !group && participants[0] ? { mine: participants[0].mine, name: participants[0].name } : null;
    const contributions = group ? { participants, totalCents: participants.reduce((sum, entry) => sum + (entry.amountCents ?? 0), 0), mine: participants.find(entry => entry.mine) ?? null } : null;
    const fields = { ...gift };
    delete fields.group; // legacy owner flag, never shown again
    return { ...fields, imageUrl: gift.imageId ? await ctx.storage.getUrl(gift.imageId) : null, group, noteCount, reservation: single, contributions };
  }));
  return { title: list.title, description: list.description, date: list.date, status: list.status, cover: list.cover, imageUrl: list.imageId ? await ctx.storage.getUrl(list.imageId) : null, ownerName: owner?.name ?? "Un amico", gifts: visibleGifts };
}
