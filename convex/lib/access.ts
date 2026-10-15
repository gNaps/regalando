import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type Context = QueryCtx | MutationCtx;

export async function requireUser(ctx: Context) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Accedi per continuare.");
  const user = await ctx.db.query("users").withIndex("by_clerkId", q => q.eq("clerkId", identity.subject)).unique();
  if (!user || user.status !== "active") throw new ConvexError("Account non disponibile.");
  return user;
}

export async function requireOwner(ctx: Context, listId: Id<"lists">) {
  const user = await requireUser(ctx);
  const list = await ctx.db.get(listId);
  if (!list || list.ownerId !== user._id) throw new ConvexError("Lista non disponibile.");
  return { user, list };
}

export async function requireParticipant(ctx: Context, listId: Id<"lists">) {
  const user = await requireUser(ctx);
  const list = await ctx.db.get(listId);
  if (!list || list.ownerId === user._id) throw new ConvexError("Lista non disponibile.");
  const owner = await ctx.db.get(list.ownerId);
  if (!owner || owner.status !== "active") throw new ConvexError("Lista non disponibile.");
  const membership = await ctx.db.query("memberships").withIndex("by_list_user", q => q.eq("listId", listId).eq("userId", user._id)).unique();
  if (!membership || membership.status !== "active") throw new ConvexError("Lista non disponibile.");
  return { user, list };
}

export function requireActive(status: "active" | "archived") {
  if (status !== "active") throw new ConvexError("Riattiva la lista per modificarla.");
}
