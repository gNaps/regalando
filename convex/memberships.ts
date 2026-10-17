import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireActive, requireOwner } from "./lib/access";

export const list = query({ args: { listId: v.id("lists") }, handler: async (ctx, { listId }) => {
  await requireOwner(ctx, listId);
  const memberships = await ctx.db.query("memberships").withIndex("by_list_user", q => q.eq("listId", listId)).collect();
  return Promise.all(memberships.map(async member => {
    const user = await ctx.db.get(member.userId);
    return { id: member._id, name: user?.name ?? "Un amico", status: member.status, joinedAt: member.joinedAt };
  }));
} });

export const revoke = mutation({ args: { membershipId: v.id("memberships") }, handler: async (ctx, { membershipId }) => {
  const member = await ctx.db.get(membershipId);
  if (!member) throw new ConvexError("Partecipante non disponibile.");
  await requireOwner(ctx, member.listId);
  if (member.status === "revoked") return;
  await ctx.db.patch(member._id, { status: "revoked" });
  const reservations = await ctx.db.query("reservations").withIndex("by_user", q => q.eq("userId", member.userId).eq("status", "active")).collect();
  for (const reservation of reservations) {
    if (reservation.listId === member.listId) await ctx.db.patch(reservation._id, { status: "cancelled", updatedAt: Date.now() });
  }
  const notes = await ctx.db.query("giftNotes").withIndex("by_user", q => q.eq("userId", member.userId)).collect();
  for (const note of notes) if (note.listId === member.listId) await ctx.db.delete(note._id);
  // Identical response regardless of whether the member had chosen any gifts or written notes.
} });

export const restore = mutation({ args: { membershipId: v.id("memberships") }, handler: async (ctx, { membershipId }) => {
  const member = await ctx.db.get(membershipId);
  if (!member) throw new ConvexError("Partecipante non disponibile.");
  const { list } = await requireOwner(ctx, member.listId);
  requireActive(list.status);
  const user = await ctx.db.get(member.userId);
  if (!user || user.status !== "active") throw new ConvexError("Account non disponibile.");
  if (member.status !== "active") await ctx.db.patch(member._id, { status: "active" });
} });
