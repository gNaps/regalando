import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { requireActive, requireOwner, requireUser } from "./lib/access";
import { inviteTokenPattern, tokenDigest } from "./lib/inviteToken";

export async function findInvite(ctx: QueryCtx | MutationCtx, token: string, activeOnly = true) {
  if (!inviteTokenPattern.test(token)) return null;
  const digest = await tokenDigest(token);
  const invite = await ctx.db.query("invites").withIndex("by_digest", q => q.eq("digest", digest)).unique();
  return invite && (!activeOnly || invite.status === "active") ? invite : null;
}

export const getOwnerLink = query({ args: { listId: v.id("lists") }, handler: async (ctx, { listId }) => {
  await requireOwner(ctx, listId);
  const invite = await ctx.db.query("invites").withIndex("by_list", q => q.eq("listId", listId).eq("status", "active")).unique();
  return invite ? { token: invite.token } : null;
} });

// Only a server action may supply the randomly generated token. Authorization is
// checked again inside the transaction, including when actions race or retry.
export const install = internalMutation({ args: { listId: v.id("lists"), token: v.string(), rotate: v.boolean() }, handler: async (ctx, { listId, token, rotate }) => {
  const { list } = await requireOwner(ctx, listId);
  requireActive(list.status);
  if (!inviteTokenPattern.test(token)) throw new ConvexError("Invito non disponibile.");
  const existing = await ctx.db.query("invites").withIndex("by_list", q => q.eq("listId", listId).eq("status", "active")).unique();
  if (existing && !rotate) return { token: existing.token };
  if (existing) await ctx.db.patch(existing._id, { status: "revoked" });
  await ctx.db.insert("invites", { listId, token, digest: await tokenDigest(token), status: "active" });
  return { token };
} });

export const disable = mutation({ args: { listId: v.id("lists") }, handler: async (ctx, { listId }) => {
  await requireOwner(ctx, listId);
  const invite = await ctx.db.query("invites").withIndex("by_list", q => q.eq("listId", listId).eq("status", "active")).unique();
  if (invite) await ctx.db.patch(invite._id, { status: "revoked" });
} });

export const preview = query({ args: { token: v.string() }, handler: async (ctx, { token }) => {
  const invite = await findInvite(ctx, token);
  if (!invite) return null;
  const list = await ctx.db.get(invite.listId);
  if (!list) return null;
  const owner = await ctx.db.get(list.ownerId);
  if (!owner || owner.status !== "active") return null;
  const identity = await ctx.auth.getUserIdentity();
  const user = identity ? await ctx.db.query("users").withIndex("by_clerkId", q => q.eq("clerkId", identity.subject)).unique() : null;
  let access: "guest" | "new" | "owner" | "joined" | "revoked" | "disabled" = identity ? "new" : "guest";
  if (user?.status === "deleted") access = "disabled";
  else if (user) {
    if (user._id === list.ownerId) access = "owner";
    else {
      const membership = await ctx.db.query("memberships").withIndex("by_list_user", q => q.eq("listId", list._id).eq("userId", user._id)).unique();
      if (membership) access = membership.status === "active" ? "joined" : "revoked";
    }
  }
  // The list ID is returned only to users who already have access. No gifts,
  // description, participants, email addresses or reservation data are public.
  return { title: list.title, ownerName: owner.name, date: list.date, occasion: list.occasion, archived: list.status === "archived", access, listId: access === "owner" || access === "joined" ? list._id : undefined };
} });

export const join = mutation({ args: { token: v.string() }, handler: async (ctx, { token }) => {
  const user = await requireUser(ctx);
  const invite = await findInvite(ctx, token);
  if (!invite) throw new ConvexError("Questo invito non è più disponibile. Chiedi un nuovo link al proprietario.");
  const list = await ctx.db.get(invite.listId);
  const owner = list ? await ctx.db.get(list.ownerId) : null;
  if (!list || !owner || owner.status !== "active") throw new ConvexError("Questo invito non è più disponibile.");
  if (list.ownerId === user._id) return list._id;
  const membership = await ctx.db.query("memberships").withIndex("by_list_user", q => q.eq("listId", list._id).eq("userId", user._id)).unique();
  if (membership?.status === "revoked") throw new ConvexError("Il tuo accesso è stato rimosso. Chiedi al proprietario di riabilitarti.");
  if (membership?.status === "active") return list._id;
  if (list.status !== "active") throw new ConvexError("Questa lista è archiviata e non accetta nuovi partecipanti.");
  await ctx.db.insert("memberships", { listId: list._id, userId: user._id, status: "active", joinedAt: Date.now() });
  return list._id;
} });
