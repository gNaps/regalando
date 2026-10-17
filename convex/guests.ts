import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { findInvite } from "./invites";
import { requireActive, requireOwner } from "./lib/access";
import { allowGuestViewer, guestSession } from "./lib/guestAccess";
import { inviteTokenPattern, tokenDigest } from "./lib/inviteToken";
import { participantView } from "./lib/participantView";

export const install = internalMutation({ args: { token: v.string(), secret: v.string() }, handler: async (ctx, { token, secret }) => {
  const invite = await findInvite(ctx, token);
  const list = invite ? await ctx.db.get(invite.listId) : null;
  if (!list || !inviteTokenPattern.test(secret)) throw new ConvexError("Questo invito non è disponibile.");
  await allowGuestViewer(ctx, list);
  if (list.status !== "active") throw new ConvexError("La lista è archiviata e non accetta nuovi ospiti.");
  const secretDigest = await tokenDigest(secret);
  const existing = await ctx.db.query("guestSessions").withIndex("by_digest", q => q.eq("secretDigest", secretDigest)).unique();
  if (existing) throw new ConvexError("Non è stato possibile creare l’accesso ospite. Riprova.");
  await ctx.db.insert("guestSessions", { listId: list._id, secretDigest, status: "active" });
  return { secret };
} });

export const getDetail = query({ args: { token: v.string(), secret: v.string() }, handler: async (ctx, { token, secret }) => {
  const result = await guestSession(ctx, token, secret);
  if (!result) return { access: "unavailable" as const };
  if (result.guest.status === "revoked") return { access: "revoked" as const };
  return { access: "active" as const, detail: await participantView(ctx, result.list, { guestSessionId: result.guest._id }) };
} });

export const listSessions = query({ args: { listId: v.id("lists") }, handler: async (ctx, { listId }) => {
  await requireOwner(ctx, listId);
  const guests = await ctx.db.query("guestSessions").withIndex("by_list", q => q.eq("listId", listId)).collect();
  // Visits are created before any booking. Neither the name entered while
  // reserving nor any reservation counts/timestamps reach the owner.
  return guests.map((guest, index) => ({ id: guest._id, name: `Ospite ${index + 1}`, status: guest.status }));
} });

export const revoke = mutation({ args: { guestSessionId: v.id("guestSessions") }, handler: async (ctx, { guestSessionId }) => {
  const guest = await ctx.db.get(guestSessionId);
  if (!guest) throw new ConvexError("Ospite non disponibile.");
  await requireOwner(ctx, guest.listId);
  if (guest.status === "revoked") return;
  await ctx.db.patch(guest._id, { status: "revoked" });
  const reservations = await ctx.db.query("reservations").withIndex("by_guest", q => q.eq("guestSessionId", guest._id).eq("status", "active")).collect();
  for (const reservation of reservations) await ctx.db.patch(reservation._id, { status: "cancelled", updatedAt: Date.now() });
  const notes = await ctx.db.query("giftNotes").withIndex("by_guest", q => q.eq("guestSessionId", guest._id)).collect();
  for (const note of notes) await ctx.db.delete(note._id);
} });

export const restore = mutation({ args: { guestSessionId: v.id("guestSessions") }, handler: async (ctx, { guestSessionId }) => {
  const guest = await ctx.db.get(guestSessionId);
  if (!guest) throw new ConvexError("Ospite non disponibile.");
  const { list } = await requireOwner(ctx, guest.listId);
  requireActive(list.status);
  if (guest.status !== "active") await ctx.db.patch(guest._id, { status: "active" });
} });
