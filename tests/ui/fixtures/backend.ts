import { useSyncExternalStore } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { giftCategories } from "@/lib/domain";
import { getFunctionName, type FunctionReference } from "convex/server";
import { parseListImport } from "@/lib/list-import";

const listId = "fixture-list" as Id<"lists">;
let detail: { list: Doc<"lists">; gifts: Doc<"gifts">[] } = {
  list: { _id: listId, _creationTime: 1, ownerId: "fixture-owner" as Id<"users">, title: "Compleanno", description: "Le mie idee regalo", cover: "plum", status: "active", updatedAt: 1 },
  gifts: [
    { _id: "fixture-book" as Id<"gifts">, _creationTime: 1, listId, title: "Un libro", description: "Edizione illustrata", category: "books", priority: "favorite", priceCents: 2000, currency: "EUR", removed: false, version: 1, updatedAt: 1, locations: [{ kind: "online", url: "https://example.com/libro" }, { kind: "physical", name: "Libreria", address: "Milano" }] },
    { _id: "fixture-headphones" as Id<"gifts">, _creationTime: 1, listId, title: "Cuffie", description: "Colore argento", category: "tech", priority: "normal", priceCents: 12000, currency: "EUR", removed: false, version: 1, updatedAt: 1, locations: [] },
  ],
};
const listeners = new Set<() => void>();
let revision = 0;
function notify() { revision++; listeners.forEach(listener => listener()); }
const params = new URLSearchParams(location.search);
if (params.has("gift-limit") || params.has("near-gift-limit")) {
  const total = params.has("gift-limit") ? 15 : 14;
  while (detail.gifts.length < total) {
    const index = detail.gifts.length;
    detail.gifts.push({ ...detail.gifts[1], _id: `fixture-extra-${index}` as Id<"gifts">, title: `Regalo ${index + 1}` });
  }
}
const token = "A".repeat(43);
const guestSecret = "S".repeat(43);
let guestSessions = params.has("with-guest") ? [{ id: "fixture-guest" as Id<"guestSessions">, name: "Ospite 1", status: "active" as "active" | "revoked" }] : [];
const imageUrls = new Map<string, string>();
const bookings = new Map<string, { mine: boolean; name: string }>();
if (params.has("taken")) bookings.set("fixture-book", { mine: false, name: "Anna" });
if (params.has("console")) detail.gifts.push({ _id: "fixture-console" as Id<"gifts">, _creationTime: 1, listId, title: "Una console", description: "Da dividere tra amici", category: "gaming", priority: "normal", priceCents: 50000, currency: "EUR", removed: false, version: 1, updatedAt: 1, locations: [] });
type Pledge = { mine: boolean; name: string; amountCents?: number; group: boolean };
const pledges = new Map<string, Pledge[]>();
if (params.has("with-proposal")) pledges.set("fixture-console", [{ mine: false, name: "Marco", amountCents: 10000, group: true }]);
type Note = { id: Id<"giftNotes">; giftId: Id<"gifts">; name: string; body: string; createdAt: number; mine: boolean };
let notes: Note[] = params.has("with-notes") ? [{ id: "fixture-note-1" as Id<"giftNotes">, giftId: "fixture-book" as Id<"gifts">, name: "Marco", body: "Io prendo l’edizione rilegata", createdAt: Date.UTC(2026, 9, 10, 10, 0), mine: false }] : [];
function participantDetail() {
  return { ...detail.list, ownerName: "Gabriele", gifts: detail.gifts.map(gift => {
    const all = pledges.get(gift._id) ?? [];
    const group = all.some(entry => entry.group) || all.length > 1;
    const participants = all.map(entry => ({ mine: entry.mine, name: entry.name, amountCents: entry.amountCents }));
    const single = all[0] ? { mine: all[0].mine, name: all[0].name } : bookings.get(gift._id) ?? null;
    return { ...gift, group, noteCount: notes.filter(note => note.giftId === gift._id).length, reservation: group ? null : single, contributions: group ? { participants, totalCents: participants.reduce((sum, entry) => sum + (entry.amountCents ?? 0), 0), mine: participants.find(entry => entry.mine) ?? null } : null };
  }) };
}
let ownerLink: { token: string } | null = params.has("with-link") ? { token } : null;
let members = params.has("with-member") ? [{ id: "fixture-member" as Id<"memberships">, name: "Giulia", status: "active" as "active" | "revoked", joinedAt: 1 }] : [];
const preview = { title: "Compleanno", ownerName: "Gabriele", archived: params.has("archived"), access: params.has("guest") ? "guest" : params.has("revoked") ? "revoked" : params.has("joined") ? "joined" : "new", listId: params.has("joined") ? listId : undefined };
detail.list.cover = (["plum", "sage", "sand"] as const).find(cover => cover === params.get("cover")) ?? "plum";
if (params.has("archived")) detail.list.status = "archived";
if (params.has("all-categories")) {
  detail.gifts = (Object.entries(giftCategories) as [keyof typeof giftCategories, string][]).map(([category, title], index) => ({
    _id: `fixture-${category}` as Id<"gifts">, _creationTime: 1, listId, title, description: "Un’idea per i tuoi desideri", category, priority: "normal", priceCents: (index + 1) * 1000, currency: "EUR", removed: false, version: 1, updatedAt: 1, locations: [],
  }));
}
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }

export function useConvexAuth() { return { isLoading: false, isAuthenticated: !params.has("guest") }; }
export function useQuery(reference: FunctionReference<"query">, args?: { secret?: string; giftId?: Id<"gifts"> } | "skip") {
  useSyncExternalStore(subscribe, () => revision);
  const name = getFunctionName(reference);
  if (args === "skip") return undefined;
  if (name === "notes:listForGift" || name === "notes:listAsGuest") return notes.filter(note => note.giftId === args?.giftId).map(note => ({ id: note.id, name: note.name, body: note.body, createdAt: note.createdAt, mine: note.mine }));
  if (name === "lists:getAccess") return params.has("revoked") ? "unavailable" : params.has("participant") ? "participant" : "owner";
  if (name === "invites:getOwnerLink") return ownerLink;
  if (name === "memberships:list") return members;
  if (name === "guests:listSessions") return guestSessions;
  if (name === "guests:getDetail") return args?.secret !== guestSecret ? { access: "unavailable" } : params.has("revoked") ? { access: "revoked" } : { access: "active", detail: participantDetail() };
  if (name === "invites:preview") return params.has("invalid-invite") ? null : preview;
  if (name === "lists:getOwned") {
    const owned = [
    { id: listId, title: "Il mio compleanno", description: "Piccole cose che mi fanno felice, da scoprire un desiderio alla volta.", cover: "plum", status: "active", giftCount: 8, date: "2026-11-12" },
    { id: "fixture-home", title: "Un posto da chiamare casa", description: "Idee e dettagli per la nostra nuova casa.", cover: "sage", status: "active", giftCount: 12 },
    { id: "fixture-christmas", title: "La magia del Natale", description: "Un pensiero da scartare insieme.", cover: "sand", status: "active", giftCount: 4, date: "2026-12-25" },
    { id: "fixture-archived", title: "La mia laurea", description: "Un traguardo speciale.", cover: "sand", status: "archived", giftCount: 6 },
    ];
    if (params.has("empty-lists")) return [];
    if (params.has("below-list-limit")) return owned.slice(0, 2);
    if (params.has("list-limit")) return [owned[0], owned[1], owned[3]];
    return owned;
  }
  if (name === "lists:getJoined") return [{ id: listId, title: detail.list.title, description: detail.list.description, cover: detail.list.cover, status: detail.list.status, owner: "Gabriele", giftCount: detail.gifts.length }];
  if (name === "lists:getParticipantDetail") return participantDetail();
  return { ...detail, list: { ...detail.list, imageUrl: imageUrls.get(listId) }, gifts: detail.gifts.map(gift => ({ ...gift, imageUrl: imageUrls.get(gift._id) })) };
}
export function useAction(reference: FunctionReference<"action">) {
  const name = getFunctionName(reference);
  return async (args?: { listId?: string; giftId?: string; bytes?: ArrayBuffer; title?: string; description?: string; date?: string; cover?: string; photo?: ArrayBuffer | null }) => {
    if (name === "giftEditor:save") {
      const values = args as unknown as GiftValues & { giftId?: Id<"gifts">; expectedVersion?: number; photo?: ArrayBuffer | null };
      if (params.has("save-error") || (params.has("image-error") && values.photo instanceof ArrayBuffer)) throw new Error("Simulated gift save failure");
      const id = values.giftId ?? `fixture-gift-${detail.gifts.length}` as Id<"gifts">;
      const current = detail.gifts.find(gift => gift._id === id);
      if (values.giftId && (!current || current.version !== values.expectedVersion)) throw new Error("Fixture version mismatch");
      const fields = {title:values.title,description:values.description,priceCents:values.priceCents,currency:values.currency,category:values.category,priority:values.priority,locations:values.locations};
      if(current) detail = {...detail,gifts:detail.gifts.map(gift=>gift._id===id ? {...gift,...fields,version:gift.version+1}:gift)};
      else detail = {...detail,gifts:[...detail.gifts,{...fields,listId,_id:id,_creationTime:1,removed:false,version:1,updatedAt:1}]};
      if(values.photo!==undefined) {
        const previous=imageUrls.get(id);if(previous) URL.revokeObjectURL(previous);
        if(values.photo===null) imageUrls.delete(id);
        else imageUrls.set(id,URL.createObjectURL(new Blob([values.photo],{type:"image/jpeg"})));
      }
      notify(); return id;
    }
    if (name === "listEditor:save") {
      const values = args as unknown as { listId?: string; title: string; description: string; date?: string; cover: "plum" | "sage" | "sand"; photo?: ArrayBuffer | null };
      if (params.has("save-error")) throw new Error("Fixture save failed");
      if (params.has("image-error") && values.photo instanceof ArrayBuffer) throw new Error("Simulated image failure");
      detail = { ...detail, list: { ...detail.list, title: values.title, description: values.description, date: values.date, cover: values.cover } };
      if (values.photo !== undefined) {
        const previous = imageUrls.get(listId); if (previous) URL.revokeObjectURL(previous);
        if (values.photo === null) imageUrls.delete(listId);
        else imageUrls.set(listId, URL.createObjectURL(new Blob([values.photo],{type:"image/jpeg"})));
      }
      document.body.dataset.listSaveCalls = String(Number(document.body.dataset.listSaveCalls || 0) + 1);
      notify(); return listId;
    }
    if (name === "images:upload") {
      if (params.has("image-error")) throw new Error("Simulated image failure");
      const key = args?.giftId ?? args?.listId ?? "";
      const previous = imageUrls.get(key); if (previous) URL.revokeObjectURL(previous);
      imageUrls.set(key, URL.createObjectURL(new Blob([args!.bytes!], { type: "image/jpeg" })));
      document.body.dataset.imageBytes = String(args!.bytes!.byteLength);
      notify(); return null;
    }
    if (params.has("invite-error")) throw new Error("Simulated action failure");
    if (name === "guestAccess:create") return { secret: guestSecret };
    if (name === "productLinks:preview") {
      document.body.dataset.previewCalls = String(Number(document.body.dataset.previewCalls || 0) + 1);
      if (params.has("preview-error")) throw Object.assign(new Error("Simulated preview failure"), { data: "Hai richiesto molte anteprime in poco tempo. Riprova tra qualche minuto." });
      if (params.has("preview-empty")) return { url: "https://example.com/vaso", fetched: false };
      return { url: "https://example.com/vaso", fetched: true, title: "Vaso in ceramica", description: "Fatto a mano", priceCents: 4550, siteName: "Bottega" };
    }
    ownerLink = { token: name === "inviteLinks:rotate" ? "B".repeat(43) : token };
    notify(); return ownerLink;
  };
}

type GiftValues = Omit<Doc<"gifts">, "_id" | "_creationTime" | "removed" | "version" | "updatedAt">;
type EditValues = Omit<GiftValues, "listId"> & { giftId: Id<"gifts">; expectedVersion: number };
type RemoveValues = { giftId: Id<"gifts">; expectedVersion: number };

export function useMutation(reference: FunctionReference<"mutation">) {
  const name = getFunctionName(reference);
  return async (args: GiftValues | EditValues | RemoveValues | { json: string } | { listId?: Id<"lists">; archived?: boolean; membershipId?: Id<"memberships">; token?: string; guestSessionId?: Id<"guestSessions">; giftId?: Id<"gifts">; name?: string; amountCents?: number; body?: string; noteId?: Id<"giftNotes"> }) => {
    if (name === "lists:importJson") {
      const calls = Number(document.body.dataset.importAttempts || 0) + 1;
      document.body.dataset.importAttempts = String(calls);
      if (params.has("import-error-once") && calls === 1) throw new Error("Simulated import failure");
      const imported = parseListImport((args as { json: string }).json);
      document.body.dataset.importedList = JSON.stringify(imported);
      notify(); return listId;
    }
    if (name === "images:remove") {
      const target = args as { listId: string; giftId?: string };
      const key = target.giftId ?? target.listId;
      const previous = imageUrls.get(key); if (previous) URL.revokeObjectURL(previous);
      imageUrls.delete(key); notify(); return null;
    }
    if (name === "profiles:ensure") return "fixture-user";
    if (name.startsWith("notes:")) {
      const values = args as { giftId?: Id<"gifts">; name?: string; body?: string; noteId?: Id<"giftNotes"> };
      if (params.has("note-error")) throw new Error("Simulated note failure");
      if (name === "notes:add" || name === "notes:addAsGuest") notes = [...notes, { id: `fixture-note-${notes.length + 1}` as Id<"giftNotes">, giftId: values.giftId!, name: values.name?.trim() || "Giulia", body: values.body ?? "", createdAt: Date.now(), mine: true }];
      else notes = notes.filter(note => note.id !== values.noteId);
      document.body.dataset.noteCalls = String(Number(document.body.dataset.noteCalls || 0) + 1);
      notify(); return null;
    }
    if (name === "lists:setArchived") {
      if (params.has("archive-error")) throw new Error("Fixture archive failed");
      const { archived } = args as { archived: boolean };
      detail = { ...detail, list: { ...detail.list, status: archived ? "archived" : "active" } };
      document.body.dataset.archiveCalls = String(Number(document.body.dataset.archiveCalls || 0) + 1);
      notify(); return null;
    }
    if (name === "invites:join") {
      if (params.has("invite-error")) throw new Error("Simulated join failure");
      document.body.dataset.joined = "true"; return listId;
    }
    if (name === "invites:disable") { ownerLink = null; notify(); return null; }
    if (name === "guests:revoke" || name === "guests:restore") {
      guestSessions = guestSessions.map(guest => ({ ...guest, status: name === "guests:revoke" ? "revoked" : "active" })); notify(); return null;
    }
    if (name.startsWith("reservations:")) {
      const values = args as { giftId: Id<"gifts">; name?: string; amountCents?: number; group?: boolean };
      if (params.has("booking-error")) throw new Error("Simulated booking failure");
      const current = pledges.get(values.giftId) ?? [];
      const mine = current.find(entry => entry.mine);
      const others = current.filter(entry => !entry.mine);
      const open = others.some(entry => entry.group);
      if (open || mine?.group || values.group) {
        const group = values.group === undefined ? Boolean(mine?.group) || others.length > 0 : values.group || others.length > 0;
        pledges.set(values.giftId, name.includes("reserve") ? [...others, { mine: true, name: values.name?.trim() || mine?.name || "Giulia", amountCents: group ? values.amountCents : undefined, group }] : others);
        bookings.delete(values.giftId);
      } else if (name.includes("reserve")) bookings.set(values.giftId, { mine: true, name: values.name?.trim() || "Giulia" });
      else { bookings.delete(values.giftId); pledges.delete(values.giftId); }
      document.body.dataset.bookingCalls = String(Number(document.body.dataset.bookingCalls || 0) + 1);
      notify(); return "fixture-reservation";
    }
    if (name === "memberships:revoke" || name === "memberships:restore") {
      members = members.map(member => ({ ...member, status: name === "memberships:revoke" ? "revoked" : "active" })); notify(); return null;
    }
    if (name === "gifts:remove" && params.has("delete-error")) throw new Error("Fixture deletion failed");
    if (name !== "gifts:remove" && params.has("save-error")) throw new Error("Fixture save failed");
    let id: Id<"gifts">;
    if (name === "gifts:create") {
      const gift = args as GiftValues;
      id = `fixture-gift-${detail.gifts.length}` as Id<"gifts">;
      detail = { ...detail, gifts: [...detail.gifts, { ...gift, _id: id, _creationTime: 1, removed: false, version: 1, updatedAt: 1 }] };
    } else {
      const target = args as RemoveValues;
      id = target.giftId;
      const current = detail.gifts.find(gift => gift._id === id);
      if (!current || current.version !== target.expectedVersion) throw new Error("Fixture version mismatch");
      if (name === "gifts:remove") detail = { ...detail, gifts: detail.gifts.filter(gift => gift._id !== id) };
      else if (name === "gifts:update") {
        const values = args as EditValues;
        const fields = { title: values.title, description: values.description, priceCents: values.priceCents, currency: values.currency, category: values.category, priority: values.priority, locations: values.locations };
        detail = { ...detail, gifts: detail.gifts.map(gift => gift._id === id ? { ...gift, ...fields, version: gift.version + 1 } : gift) };
      } else throw new Error(`Unexpected fixture mutation: ${name}`);
    }
    notify();
    return id;
  };
}
