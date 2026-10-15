import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { findInvite } from "../invites";
import { inviteTokenPattern, tokenDigest } from "./inviteToken";

type Context = QueryCtx | MutationCtx;

export async function allowGuestViewer(ctx: Context, list: Doc<"lists">) {
  const owner = await ctx.db.get(list.ownerId);
  if (!owner || owner.status !== "active") throw new ConvexError("Lista non disponibile.");
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return;
  const user = await ctx.db.query("users").withIndex("by_clerkId", q => q.eq("clerkId", identity.subject)).unique();
  if (identity.subject === owner.clerkId || user?.status === "deleted") throw new ConvexError("Accesso ospite non disponibile per questo account.");
  if (user) {
    const membership = await ctx.db.query("memberships").withIndex("by_list_user", q => q.eq("listId", list._id).eq("userId", user._id)).unique();
    if (membership?.status === "revoked") throw new ConvexError("Il tuo accesso è stato rimosso.");
  }
}

export async function guestSession(ctx: Context, token: string, secret: string) {
  if (!inviteTokenPattern.test(secret)) return null;
  const invite = await findInvite(ctx, token, false);
  if (!invite) return null;
  const digest = await tokenDigest(secret);
  const guest = await ctx.db.query("guestSessions").withIndex("by_digest", q => q.eq("secretDigest", digest)).unique();
  if (!guest || guest.listId !== invite.listId) return null;
  const list = await ctx.db.get(guest.listId);
  if (!list) return null;
  await allowGuestViewer(ctx, list);
  return { guest, list };
}

export async function requireGuest(ctx: Context, token: string, secret: string) {
  const result = await guestSession(ctx, token, secret);
  if (!result || result.guest.status !== "active") throw new ConvexError("Il tuo accesso ospite non è disponibile. Chiedi al proprietario di verificarlo.");
  return result;
}
