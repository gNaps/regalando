import { useSyncExternalStore } from "react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { giftCategories } from "@/lib/domain";
import { getFunctionName, type FunctionReference } from "convex/server";

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
const token = "A".repeat(43);
const guestSecret = "S".repeat(43);
let guestSessions = params.has("with-guest") ? [{ id: "fixture-guest" as Id<"guestSessions">, name: "Ospite 1", status: "active" as "active" | "revoked" }] : [];
const bookings = new Map<string, { mine: boolean; name: string }>();
if (params.has("taken")) bookings.set("fixture-book", { mine: false, name: "Anna" });
function participantDetail() { return { ...detail.list, ownerName: "Gabriele", gifts: detail.gifts.map(gift => ({ ...gift, reservation: bookings.get(gift._id) ?? null })) }; }
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
export function useQuery(reference: FunctionReference<"query">, args?: { secret?: string }) {
  useSyncExternalStore(subscribe, () => revision);
  const name = getFunctionName(reference);
  if (name === "lists:getAccess") return params.has("revoked") ? "unavailable" : params.has("participant") ? "participant" : "owner";
  if (name === "invites:getOwnerLink") return ownerLink;
  if (name === "memberships:list") return members;
  if (name === "guests:listSessions") return guestSessions;
  if (name === "guests:getDetail") return args?.secret !== guestSecret ? { access: "unavailable" } : params.has("revoked") ? { access: "revoked" } : { access: "active", detail: participantDetail() };
  if (name === "invites:preview") return params.has("invalid-invite") ? null : preview;
  if (name === "lists:getJoined") return [{ id: listId, title: detail.list.title, description: detail.list.description, cover: detail.list.cover, status: detail.list.status, owner: "Gabriele", giftCount: detail.gifts.length }];
  if (name === "lists:getParticipantDetail") return participantDetail();
  return detail;
}
export function useAction(reference: FunctionReference<"action">) {
  const name = getFunctionName(reference);
  return async () => {
    if (params.has("invite-error")) throw new Error("Simulated action failure");
    if (name === "guestAccess:create") return { secret: guestSecret };
    ownerLink = { token: name === "inviteLinks:rotate" ? "B".repeat(43) : token };
    notify(); return ownerLink;
  };
}

type GiftValues = Omit<Doc<"gifts">, "_id" | "_creationTime" | "removed" | "version" | "updatedAt">;
type EditValues = Omit<GiftValues, "listId"> & { giftId: Id<"gifts">; expectedVersion: number };
type RemoveValues = { giftId: Id<"gifts">; expectedVersion: number };

export function useMutation(reference: FunctionReference<"mutation">) {
  const name = getFunctionName(reference);
  return async (args: GiftValues | EditValues | RemoveValues | { listId?: Id<"lists">; archived?: boolean; membershipId?: Id<"memberships">; token?: string; guestSessionId?: Id<"guestSessions">; giftId?: Id<"gifts">; name?: string }) => {
    if (name === "profiles:ensure") return "fixture-user";
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
      const values = args as { giftId: Id<"gifts">; name?: string };
      if (params.has("booking-error")) throw new Error("Simulated booking failure");
      if (name.includes("reserve")) bookings.set(values.giftId, { mine: true, name: values.name?.trim() || "Giulia" });
      else bookings.delete(values.giftId);
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
