import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireParticipant } from "./lib/access";
import { requireGuest } from "./lib/guestAccess";
import { isViewer } from "./lib/participantView";
import { text } from "./lib/validation";

// Notes let friends coordinate on a gift ("I'll take the blue one", "already wrapped").
// They are readable only through participant and guest endpoints: the owner has no query that touches this table.

export const noteLimit = 500;
export const notesPerGift = 100;

type Context = QueryCtx | MutationCtx;
type Viewer = { userId?: Id<"users">; guestSessionId?: Id<"guestSessions"> };

async function giftInList(ctx: Context, giftId: Id<"gifts">, listId?: Id<"lists">) {
  const gift = await ctx.db.get(giftId);
  if (!gift || gift.removed || (listId && gift.listId !== listId)) throw new ConvexError("Regalo non disponibile.");
  return gift;
}

async function notesFor(ctx: Context, gift: Doc<"gifts">, viewer: Viewer) {
  const notes = await ctx.db.query("giftNotes").withIndex("by_gift", q => q.eq("giftId", gift._id)).collect();
  return notes.map(note => ({ id: note._id, name: note.authorName, body: note.body, createdAt: note.createdAt, mine: isViewer(note, viewer) }));
}

async function addNote(ctx: MutationCtx, gift: Doc<"gifts">, list: Doc<"lists">, author: Viewer & { authorName: string }, body: string) {
  if (list.status !== "active") throw new ConvexError("La lista è archiviata: non puoi aggiungere note.");
  const content = text(body, noteLimit, true);
  const existing = await ctx.db.query("giftNotes").withIndex("by_gift", q => q.eq("giftId", gift._id)).collect();
  if (existing.length >= notesPerGift) throw new ConvexError("Questo regalo ha già troppe note.");
  return ctx.db.insert("giftNotes", { listId: list._id, giftId: gift._id, ...author, body: content, createdAt: Date.now() });
}

async function removeNote(ctx: MutationCtx, note: Doc<"giftNotes"> | null, viewer: Viewer) {
  if (!note) return;
  if (!isViewer(note, viewer)) throw new ConvexError("Puoi eliminare solo le tue note.");
  await ctx.db.delete(note._id);
}

export const listForGift = query({ args: { giftId: v.id("gifts") }, handler: async (ctx, { giftId }) => {
  const gift = await giftInList(ctx, giftId);
  const { user } = await requireParticipant(ctx, gift.listId);
  return notesFor(ctx, gift, { userId: user._id });
} });

export const listAsGuest = query({ args: { token: v.string(), secret: v.string(), giftId: v.id("gifts") }, handler: async (ctx, { token, secret, giftId }) => {
  const { guest, list } = await requireGuest(ctx, token, secret);
  const gift = await giftInList(ctx, giftId, list._id);
  return notesFor(ctx, gift, { guestSessionId: guest._id });
} });

export const add = mutation({ args: { giftId: v.id("gifts"), body: v.string() }, handler: async (ctx, { giftId, body }) => {
  const gift = await giftInList(ctx, giftId);
  const { user, list } = await requireParticipant(ctx, gift.listId);
  return addNote(ctx, gift, list, { userId: user._id, authorName: user.name }, body);
} });

export const addAsGuest = mutation({ args: { token: v.string(), secret: v.string(), giftId: v.id("gifts"), name: v.string(), body: v.string() }, handler: async (ctx, { token, secret, giftId, name, body }) => {
  const { guest, list } = await requireGuest(ctx, token, secret);
  if (!name.trim()) throw new ConvexError("Inserisci il tuo nome per lasciare una nota.");
  const gift = await giftInList(ctx, giftId, list._id);
  return addNote(ctx, gift, list, { guestSessionId: guest._id, authorName: text(name, 80, true) }, body);
} });

export const remove = mutation({ args: { noteId: v.id("giftNotes") }, handler: async (ctx, { noteId }) => {
  const note = await ctx.db.get(noteId);
  if (!note) return;
  const { user } = await requireParticipant(ctx, note.listId);
  await removeNote(ctx, note, { userId: user._id });
} });

export const removeAsGuest = mutation({ args: { token: v.string(), secret: v.string(), noteId: v.id("giftNotes") }, handler: async (ctx, { token, secret, noteId }) => {
  const { guest, list } = await requireGuest(ctx, token, secret);
  const note = await ctx.db.get(noteId);
  if (note && note.listId !== list._id) throw new ConvexError("Nota non disponibile.");
  await removeNote(ctx, note, { guestSessionId: guest._id });
} });
