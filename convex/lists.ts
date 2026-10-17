import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser, requireOwner, requireParticipant } from "./lib/access";
import { text, validateDate } from "./lib/validation";
import { participantView } from "./lib/participantView";

export const create = mutation({
  args: { title: v.string(), description: v.string(), date: v.optional(v.string()), cover: v.union(v.literal("plum"), v.literal("sage"), v.literal("sand")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return ctx.db.insert("lists", { ownerId: user._id, title: text(args.title, 100, true), description: text(args.description, 2000), date: validateDate(args.date), cover: args.cover, status: "active", giftCount: 0, updatedAt: Date.now() });
  },
});

export const getOwned = query({ args: {}, handler: async ctx => {
  const user = await requireUser(ctx);
  const lists = await ctx.db.query("lists").withIndex("by_owner", q => q.eq("ownerId", user._id)).collect();
  return Promise.all(lists.map(async list => {
    // `giftCount` è denormalizzato; le liste create prima del campo ricadono sul conteggio diretto.
    const giftCount = list.giftCount ?? (await ctx.db.query("gifts").withIndex("by_list", q => q.eq("listId", list._id).eq("removed", false)).collect()).length;
    return { id: list._id, title: list.title, description: list.description, date: list.date, cover: list.cover, imageUrl: list.imageId ? await ctx.storage.getUrl(list.imageId) : null, status: list.status, giftCount };
  }));
} });

export const setArchived = mutation({
  args: { listId: v.id("lists"), archived: v.boolean() },
  handler: async (ctx, { listId, archived }) => {
    const { list } = await requireOwner(ctx, listId);
    const status = archived ? "archived" as const : "active" as const;
    if (list.status !== status) await ctx.db.patch(listId, { status, updatedAt: Date.now() });
  },
});

export const getOwnerDetail = query({ args: { listId: v.id("lists") }, handler: async (ctx, { listId }) => {
  const { list } = await requireOwner(ctx, listId);
  const gifts = await ctx.db.query("gifts").withIndex("by_list", q => q.eq("listId", listId).eq("removed", false)).collect();
  // Nessuna lettura delle prenotazioni nella vista del proprietario.
  return { list: { ...list, imageUrl: list.imageId ? await ctx.storage.getUrl(list.imageId) : null }, gifts: await Promise.all(gifts.map(async gift => ({ ...gift, imageUrl: gift.imageId ? await ctx.storage.getUrl(gift.imageId) : null }))) };
} });

export const getParticipantDetail = query({ args: { listId: v.id("lists") }, handler: async (ctx, { listId }) => {
  const { user, list } = await requireParticipant(ctx, listId);
  return participantView(ctx, list, { userId: user._id });
} });

export const getAccess = query({ args: { listId: v.id("lists") }, handler: async (ctx, { listId }) => {
  const user = await requireUser(ctx);
  const list = await ctx.db.get(listId);
  if (!list) return "unavailable" as const;
  if (list.ownerId === user._id) return "owner" as const;
  const owner = await ctx.db.get(list.ownerId);
  if (!owner || owner.status !== "active") return "unavailable" as const;
  const membership = await ctx.db.query("memberships").withIndex("by_list_user", q => q.eq("listId", listId).eq("userId", user._id)).unique();
  return membership?.status === "active" ? "participant" as const : "unavailable" as const;
} });

export const getJoined = query({ args: {}, handler: async ctx => {
  const user = await requireUser(ctx);
  const memberships = await ctx.db.query("memberships").withIndex("by_user", q => q.eq("userId", user._id).eq("status", "active")).collect();
  const lists = await Promise.all(memberships.map(async member => {
    const list = await ctx.db.get(member.listId);
    if (!list || list.ownerId === user._id) return null;
    const owner = await ctx.db.get(list.ownerId);
    if (!owner || owner.status !== "active") return null;
    const giftCount = list.giftCount ?? (await ctx.db.query("gifts").withIndex("by_list", q => q.eq("listId", list._id).eq("removed", false)).collect()).length;
    return { id: list._id, title: list.title, description: list.description, owner: owner.name, date: list.date, cover: list.cover, imageUrl: list.imageId ? await ctx.storage.getUrl(list.imageId) : null, status: list.status, giftCount };
  }));
  return lists.filter(list => list !== null);
} });
