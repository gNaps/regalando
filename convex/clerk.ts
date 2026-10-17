import { deleteImage } from "./lib/images";
import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

export const upsertUser = internalMutation({
  args: { clerkId: v.string(), name: v.string(), avatarUrl: v.optional(v.string()), updatedAt: v.number(), eventAt: v.number() },
  handler: async (ctx, { clerkId, name, avatarUrl, updatedAt, eventAt }) => {
    const user = await ctx.db.query("users").withIndex("by_clerkId", q => q.eq("clerkId", clerkId)).unique();
    // Clerk IDs are never reused. Late events must never resurrect a deletion.
    if (user?.status === "deleted") return;
    if (user?.clerkUpdatedAt !== undefined && (updatedAt < user.clerkUpdatedAt || updatedAt === user.clerkUpdatedAt && eventAt <= (user.clerkEventAt ?? 0))) return;
    const profile = { name: name.trim() || "Un amico", avatarUrl, clerkUpdatedAt: updatedAt, clerkEventAt: eventAt };
    if (user) await ctx.db.patch(user._id, profile);
    else await ctx.db.insert("users", { clerkId, ...profile, status: "active" });
  },
});

export const deleteUser = internalMutation({
  args: { clerkId: v.string(), eventAt: v.number() },
  handler: async (ctx, { clerkId, eventAt }) => {
    const user = await ctx.db.query("users").withIndex("by_clerkId", q => q.eq("clerkId", clerkId)).unique();
    if (user?.deletedAt !== undefined) {
      // A replay can also resume cleanup if an earlier scheduled job failed.
      await ctx.scheduler.runAfter(0, internal.clerk.purgeUser, { userId: user._id });
      return;
    }
    const tombstone = { name: "Un amico", avatarUrl: undefined, status: "deleted" as const, deletedAt: eventAt, clerkEventAt: eventAt };
    const userId = user ? user._id : await ctx.db.insert("users", { clerkId, ...tombstone });
    if (user) await ctx.db.patch(userId, tombstone);
    // Access is denied in this transaction; contents are removed in bounded batches.
    await ctx.scheduler.runAfter(0, internal.clerk.purgeUser, { userId });
  },
});

const batchSize = 100;

async function purgeReservation(ctx: MutationCtx, reservationId: Id<"reservations">) {
  const notices = await ctx.db.query("notices").withIndex("by_reservation", q => q.eq("reservationId", reservationId)).take(batchSize);
  for (const notice of notices) await ctx.db.delete(notice._id);
  if (notices.length < batchSize) await ctx.db.delete(reservationId);
}

export const purgeUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<void> => {
    const user = await ctx.db.get(userId);
    if (!user || user.status !== "deleted") return;
    const again = () => ctx.scheduler.runAfter(0, internal.clerk.purgeUser, { userId });

    // First free the user's reservations in other people's lists, including notices.
    const reservation = await ctx.db.query("reservations").withIndex("by_user", q => q.eq("userId", userId)).first();
    if (reservation) { await purgeReservation(ctx, reservation._id); await again(); return; }
    const notices = await ctx.db.query("notices").withIndex("by_user", q => q.eq("userId", userId)).take(batchSize);
    if (notices.length) { for (const notice of notices) await ctx.db.delete(notice._id); await again(); return; }
    const memberships = await ctx.db.query("memberships").withIndex("by_user", q => q.eq("userId", userId)).take(batchSize);
    if (memberships.length) { for (const member of memberships) await ctx.db.delete(member._id); await again(); return; }
    const notes = await ctx.db.query("giftNotes").withIndex("by_user", q => q.eq("userId", userId)).take(batchSize);
    if (notes.length) { for (const note of notes) await ctx.db.delete(note._id); await again(); return; }

    const list = await ctx.db.query("lists").withIndex("by_owner", q => q.eq("ownerId", userId)).first();
    if (!list) {
      const quota = await ctx.db.query("imageUploadQuota").withIndex("by_user", q => q.eq("userId", userId)).unique();
      if (quota) await ctx.db.delete(quota._id);
      const usage = await ctx.db.query("imageUsage").withIndex("by_key", q => q.eq("key", String(userId))).unique();
      if (usage) await ctx.db.delete(usage._id);
      return;
    } // Keep only the tombstone to reject delayed events and old JWTs.
    const listReservation = await ctx.db.query("reservations").withIndex("by_list", q => q.eq("listId", list._id)).first();
    if (listReservation) { await purgeReservation(ctx, listReservation._id); await again(); return; }
    const listNotes = await ctx.db.query("giftNotes").withIndex("by_list", q => q.eq("listId", list._id)).take(batchSize);
    if (listNotes.length) { for (const note of listNotes) await ctx.db.delete(note._id); await again(); return; }
    const gifts = await ctx.db.query("gifts").withIndex("by_list", q => q.eq("listId", list._id)).take(batchSize);
    if (gifts.length) {
      for (const gift of gifts) {
        await deleteImage(ctx, userId, gift.imageId);
        await ctx.db.delete(gift._id);
      }
      await again(); return;
    }
    const members = await ctx.db.query("memberships").withIndex("by_list_user", q => q.eq("listId", list._id)).take(batchSize);
    if (members.length) { for (const member of members) await ctx.db.delete(member._id); await again(); return; }
    const invites = await ctx.db.query("invites").withIndex("by_list", q => q.eq("listId", list._id)).take(batchSize);
    if (invites.length) { for (const invite of invites) await ctx.db.delete(invite._id); await again(); return; }
    const guests = await ctx.db.query("guestSessions").withIndex("by_list", q => q.eq("listId", list._id)).take(batchSize);
    if (guests.length) { for (const guest of guests) await ctx.db.delete(guest._id); await again(); return; }
    await deleteImage(ctx, userId, list.imageId);
    await ctx.db.delete(list._id);
    await again();
  },
});
