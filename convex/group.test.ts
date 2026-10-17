import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const base = { description: "", currency: "EUR" as const, category: "gaming" as const, priority: "normal" as const, locations: [] };

async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner", name: "Gabriele" });
  const friend = t.withIdentity({ subject: "friend", name: "Giulia" });
  const other = t.withIdentity({ subject: "other", name: "Marco" });
  await owner.mutation(api.profiles.ensure, {});
  await friend.mutation(api.profiles.ensure, {});
  await other.mutation(api.profiles.ensure, {});
  const listId = await owner.mutation(api.lists.create, { title: "Compleanno", description: "", cover: "sand" });
  const consoleId = await owner.mutation(api.gifts.create, { listId, title: "Una console", priceCents: 50000, ...base });
  const bookId = await owner.mutation(api.gifts.create, { listId, title: "Un libro", priceCents: 2000, ...base, category: "books" });
  const { token } = await owner.action(api.inviteLinks.create, { listId });
  await friend.mutation(api.invites.join, { token });
  await other.mutation(api.invites.join, { token });
  const guest = await t.action(api.guestAccess.create, { token });
  const credentials = { token, secret: guest.secret };
  return { t, owner, friend, other, listId, consoleId, bookId, token, credentials };
}

describe("Regalo di gruppo", () => {
  test("il primo amico propone il gruppo, gli altri aderiscono con una quota, la aggiornano ed escono; il regalo singolo resta esclusivo", async () => {
    const { t, friend, other, listId, consoleId, bookId, credentials } = await fixture();
    await friend.mutation(api.reservations.reserveGift, { giftId: consoleId, expectedVersion: 1, amountCents: 10000, group: true });
    await other.mutation(api.reservations.reserveGift, { giftId: consoleId, expectedVersion: 1, amountCents: 15000 });
    await t.mutation(api.reservations.reserveAsGuest, { ...credentials, giftId: consoleId, expectedVersion: 1, name: "Anna" });
    let view = await friend.query(api.lists.getParticipantDetail, { listId });
    let gift = view.gifts.find(entry => entry._id === consoleId)!;
    expect(gift.group).toBe(true);
    expect(gift.reservation).toBeNull();
    expect(gift.contributions).toMatchObject({ totalCents: 25000, mine: { amountCents: 10000 } });
    expect(gift.contributions?.participants.map(entry => [entry.name, entry.amountCents, entry.mine])).toEqual([["Giulia", 10000, true], ["Marco", 15000, false], ["Anna", undefined, false]]);
    // Confirming again updates the share instead of failing or duplicating.
    await friend.mutation(api.reservations.reserveGift, { giftId: consoleId, expectedVersion: 1, amountCents: 20000 });
    await expect(friend.mutation(api.reservations.reserveGift, { giftId: consoleId, expectedVersion: 1, amountCents: -5 })).rejects.toThrow();
    await other.mutation(api.reservations.cancelGift, { giftId: consoleId });
    view = await friend.query(api.lists.getParticipantDetail, { listId });
    gift = view.gifts.find(entry => entry._id === consoleId)!;
    expect(gift.contributions).toMatchObject({ totalCents: 20000 });
    expect(gift.contributions?.participants).toHaveLength(2);
    const active = await t.run(ctx => ctx.db.query("reservations").withIndex("by_gift", q => q.eq("giftId", consoleId).eq("status", "active")).collect());
    expect(active).toHaveLength(2);
    await friend.mutation(api.reservations.reserveGift, { giftId: bookId, expectedVersion: 1 });
    await expect(other.mutation(api.reservations.reserveGift, { giftId: bookId, expectedVersion: 1 })).rejects.toThrow("prenotato da un’altra persona");
    const book = (await other.query(api.lists.getParticipantDetail, { listId })).gifts.find(entry => entry._id === bookId)!;
    expect(book.group).toBe(false);
    expect(book.reservation).toEqual({ mine: false, name: "Giulia" });
    expect(book.contributions).toBeNull();
  });
  test("una prenotazione singola si apre al gruppo e torna singola solo finché si è soli; il proprietario non riceve quote, nomi o note", async () => {
    const { owner, friend, other, listId, consoleId } = await fixture();
    await friend.mutation(api.reservations.reserveGift, { giftId: consoleId, expectedVersion: 1 });
    await expect(other.mutation(api.reservations.reserveGift, { giftId: consoleId, expectedVersion: 1, group: true })).rejects.toThrow("prenotato da un’altra persona");
    let gift = (await friend.query(api.lists.getParticipantDetail, { listId })).gifts.find(entry => entry._id === consoleId)!;
    expect(gift.group).toBe(false);
    expect(gift.reservation).toEqual({ mine: true, name: "Giulia" });
    await friend.mutation(api.reservations.reserveGift, { giftId: consoleId, expectedVersion: 1, group: true });
    gift = (await friend.query(api.lists.getParticipantDetail, { listId })).gifts.find(entry => entry._id === consoleId)!;
    expect(gift.group).toBe(true);
    expect(gift.contributions?.participants).toHaveLength(1);
    await friend.mutation(api.reservations.reserveGift, { giftId: consoleId, expectedVersion: 1, group: false });
    expect((await friend.query(api.lists.getParticipantDetail, { listId })).gifts.find(entry => entry._id === consoleId)!.group).toBe(false);
    await friend.mutation(api.reservations.reserveGift, { giftId: consoleId, expectedVersion: 1, group: true, amountCents: 10000 });
    await other.mutation(api.reservations.reserveGift, { giftId: consoleId, expectedVersion: 1, amountCents: 15000 });
    // With someone else on board the initiator can no longer close the group.
    await friend.mutation(api.reservations.reserveGift, { giftId: consoleId, expectedVersion: 1, group: false });
    await friend.mutation(api.notes.add, { giftId: consoleId, body: "Prendo io il secondo controller" });
    await owner.mutation(api.gifts.update, { giftId: consoleId, expectedVersion: 1, title: "Una console", priceCents: 50000, ...base });
    gift = (await friend.query(api.lists.getParticipantDetail, { listId })).gifts.find(entry => entry._id === consoleId)!;
    expect(gift.group).toBe(true);
    expect(gift.contributions?.participants).toHaveLength(2);
    const ownerView = JSON.stringify(await owner.query(api.lists.getOwnerDetail, { listId }));
    for (const leak of ["amountCents", "contributions", "noteCount", "group", "Giulia", "Marco", "controller", "reservation"]) expect(ownerView).not.toContain(leak);
    await expect(owner.query(api.notes.listForGift, { giftId: consoleId })).rejects.toThrow();
    await expect(owner.mutation(api.notes.add, { giftId: consoleId, body: "Ciao" })).rejects.toThrow();
  });
});

describe("Note tra amici", () => {
  test("account e ospiti scrivono, leggono ed eliminano solo le proprie note", async () => {
    const { t, friend, other, consoleId, credentials } = await fixture();
    await friend.mutation(api.notes.add, { giftId: consoleId, body: "  Lo prendo in nero  " });
    await t.mutation(api.notes.addAsGuest, { ...credentials, giftId: consoleId, name: "Anna", body: "Io incarto" });
    await expect(t.mutation(api.notes.addAsGuest, { ...credentials, giftId: consoleId, name: "  ", body: "Senza nome" })).rejects.toThrow("Inserisci il tuo nome");
    await expect(friend.mutation(api.notes.add, { giftId: consoleId, body: "   " })).rejects.toThrow();
    await expect(friend.mutation(api.notes.add, { giftId: consoleId, body: "x".repeat(501) })).rejects.toThrow();
    const mine = await friend.query(api.notes.listForGift, { giftId: consoleId });
    expect(mine.map(note => [note.name, note.body, note.mine])).toEqual([["Giulia", "Lo prendo in nero", true], ["Anna", "Io incarto", false]]);
    const guestView = await t.query(api.notes.listAsGuest, { ...credentials, giftId: consoleId });
    expect(guestView.map(note => note.mine)).toEqual([false, true]);
    await expect(other.mutation(api.notes.remove, { noteId: mine[0].id })).rejects.toThrow("solo le tue note");
    await expect(t.mutation(api.notes.removeAsGuest, { ...credentials, noteId: mine[0].id })).rejects.toThrow("solo le tue note");
    await friend.mutation(api.notes.remove, { noteId: mine[0].id });
    await t.mutation(api.notes.removeAsGuest, { ...credentials, noteId: mine[1].id });
    expect(await other.query(api.notes.listForGift, { giftId: consoleId })).toEqual([]);
    const counted = (await other.query(api.lists.getParticipantDetail, { listId: (await t.run(ctx => ctx.db.get(consoleId)))!.listId })).gifts.find(entry => entry._id === consoleId)!;
    expect(counted.noteCount).toBe(0);
  });
  test("revoca e archiviazione: le note dei rimossi spariscono, le liste archiviate non ne accettano", async () => {
    const { t, owner, friend, other, listId, consoleId, credentials } = await fixture();
    await friend.mutation(api.notes.add, { giftId: consoleId, body: "Nota di Giulia" });
    await t.mutation(api.notes.addAsGuest, { ...credentials, giftId: consoleId, name: "Anna", body: "Nota di Anna" });
    const members = await owner.query(api.memberships.list, { listId });
    await owner.mutation(api.memberships.revoke, { membershipId: members.find(member => member.name === "Giulia")!.id });
    const [session] = await owner.query(api.guests.listSessions, { listId });
    await owner.mutation(api.guests.revoke, { guestSessionId: session.id });
    expect(await other.query(api.notes.listForGift, { giftId: consoleId })).toEqual([]);
    await owner.mutation(api.lists.setArchived, { listId, archived: true });
    await expect(other.mutation(api.notes.add, { giftId: consoleId, body: "Troppo tardi" })).rejects.toThrow("archiviata");
    expect(await other.query(api.notes.listForGift, { giftId: consoleId })).toEqual([]);
  });
});
