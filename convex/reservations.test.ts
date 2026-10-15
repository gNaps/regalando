import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";
import { tokenDigest } from "./lib/inviteToken";

const modules = import.meta.glob("./**/*.ts");
async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner", name: "Gabriele" });
  const friend = t.withIdentity({ subject: "friend", name: "Giulia" });
  const other = t.withIdentity({ subject: "other", name: "Marco" });
  await owner.mutation(api.profiles.ensure, {});
  await friend.mutation(api.profiles.ensure, {});
  await other.mutation(api.profiles.ensure, {});
  const listId = await owner.mutation(api.lists.create, { title: "Compleanno", description: "La mia lista", cover: "sand" });
  const giftId = await owner.mutation(api.gifts.create, { listId, title: "Un libro", description: "Illustrato", currency: "EUR", category: "books", priority: "normal", locations: [], priceCents: 2000 });
  const { token } = await owner.action(api.inviteLinks.create, { listId });
  await friend.mutation(api.invites.join, { token });
  const guest = await t.action(api.guestAccess.create, { token });
  const secondGuest = await t.action(api.guestAccess.create, { token });
  const booking = { token, secret: guest.secret, giftId, expectedVersion: 1, name: "  Anna  " };
  return { t, owner, friend, other, listId, giftId, token, guest, secondGuest, booking };
}

describe("Accesso ospite", () => {
  test("apertura senza identità o nome; la credenziale è casuale e resta solo come digest", async () => {
    const { t, token, guest } = await fixture();
    expect(guest.secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(guest.secret).not.toBe(token);
    const sessions = await t.run(ctx => ctx.db.query("guestSessions").collect());
    expect(sessions[0].secretDigest).toBe(await tokenDigest(guest.secret));
    expect(JSON.stringify(sessions)).not.toContain(guest.secret);
    expect(JSON.stringify(sessions)).not.toContain('"name"');
    expect(await t.query(api.guests.getDetail, { token, secret: guest.secret })).toMatchObject({ access: "active", detail: { title: "Compleanno" } });
  });
  test("token e credenziali inventati non rivelano regali", async () => {
    const { t, token, guest } = await fixture();
    expect(await t.query(api.guests.getDetail, { token, secret: "B".repeat(43) })).toEqual({ access: "unavailable" });
    expect(await t.query(api.guests.getDetail, { token: "C".repeat(43), secret: guest.secret })).toEqual({ access: "unavailable" });
    await expect(t.action(api.guestAccess.create, { token: "C".repeat(43) })).rejects.toThrow();
  });
  test("un proprietario autenticato non usa gli endpoint ospite per leggere le scelte", async () => {
    const { owner, token, guest, booking } = await fixture();
    await expect(owner.action(api.guestAccess.create, { token })).rejects.toThrow();
    await expect(owner.query(api.guests.getDetail, { token, secret: guest.secret })).rejects.toThrow();
    await expect(owner.mutation(api.reservations.reserveAsGuest, booking)).rejects.toThrow();
    await expect(owner.mutation(api.reservations.cancelAsGuest, { token, secret: guest.secret, giftId: booking.giftId })).rejects.toThrow();
  });
  test("link rigenerati o disattivati conservano le sessioni esistenti e impediscono nuove aperture", async () => {
    const { t, owner, listId, token, guest } = await fixture();
    await owner.action(api.inviteLinks.rotate, { listId });
    await expect(t.action(api.guestAccess.create, { token })).rejects.toThrow();
    await owner.mutation(api.invites.disable, { listId });
    expect(await t.query(api.guests.getDetail, { token, secret: guest.secret })).toMatchObject({ access: "active" });
  });
  test("rimozione ospite blocca accesso e prenotazione, cancella la scelta e può essere riabilitata", async () => {
    const { t, owner, other, listId, token, guest, booking } = await fixture();
    const [session] = await owner.query(api.guests.listSessions, { listId });
    await t.mutation(api.reservations.reserveAsGuest, booking);
    for (const actor of [t, other]) {
      await expect(actor.query(api.guests.listSessions, { listId })).rejects.toThrow();
      await expect(actor.mutation(api.guests.revoke, { guestSessionId: session.id })).rejects.toThrow();
      await expect(actor.mutation(api.guests.restore, { guestSessionId: session.id })).rejects.toThrow();
    }
    await owner.mutation(api.guests.revoke, { guestSessionId: session.id });
    await owner.mutation(api.guests.revoke, { guestSessionId: session.id });
    expect(await t.query(api.guests.getDetail, { token, secret: guest.secret })).toEqual({ access: "revoked" });
    await expect(t.mutation(api.reservations.reserveAsGuest, booking)).rejects.toThrow();
    expect((await t.run(ctx => ctx.db.query("reservations").collect()))[0].status).toBe("cancelled");
    await owner.mutation(api.guests.restore, { guestSessionId: session.id });
    expect(await t.query(api.guests.getDetail, { token, secret: guest.secret })).toMatchObject({ access: "active" });
  });
});

describe("Prenotazioni atomiche e sorpresa", () => {
  test("nome obbligatorio, limitato e ripulito anche sul backend", async () => {
    const { t, friend, booking, token, guest } = await fixture();
    for (const name of ["", "  ", "A".repeat(81)]) await expect(t.mutation(api.reservations.reserveAsGuest, { ...booking, name })).rejects.toThrow();
    await t.mutation(api.reservations.reserveAsGuest, booking);
    const result = await t.query(api.guests.getDetail, { token, secret: guest.secret });
    expect(result.access === "active" && result.detail.gifts[0].reservation).toEqual({ mine: true, name: "Anna" });
    const friendView = await friend.query(api.lists.getParticipantDetail, { listId: (await friend.query(api.lists.getJoined, {}))[0].id });
    expect(friendView.gifts[0].reservation).toEqual({ mine: false, name: "Anna" });
    expect(JSON.stringify(friendView)).not.toMatch(/secret|guestSessionId|guestName|clerkId/);
  });
  test("nome uguale e stesso invito non danno diritto ad annullare la prenotazione altrui", async () => {
    const { t, booking, secondGuest, token, giftId } = await fixture();
    await t.mutation(api.reservations.reserveAsGuest, booking);
    await expect(t.mutation(api.reservations.reserveAsGuest, { ...booking, secret: secondGuest.secret })).rejects.toThrow(/prenotato/);
    await expect(t.mutation(api.reservations.cancelAsGuest, { token, secret: secondGuest.secret, giftId })).rejects.toThrow(/solo la tua/);
    const view = await t.query(api.guests.getDetail, { token, secret: secondGuest.secret });
    expect(view.access === "active" && view.detail.gifts[0].reservation).toEqual({ mine: false, name: "Anna" });
  });
  test("retry e concorrenza tra account e ospite lasciano una sola prenotazione attiva", async () => {
    const { t, friend, booking, giftId } = await fixture();
    const results = await Promise.allSettled([t.mutation(api.reservations.reserveAsGuest, booking), friend.mutation(api.reservations.reserveGift, { giftId, expectedVersion: 1 })]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const active = await t.run(ctx => ctx.db.query("reservations").withIndex("by_gift", q => q.eq("giftId", giftId).eq("status", "active")).collect());
    expect(active).toHaveLength(1);
    if (active[0].guestSessionId) expect(await t.mutation(api.reservations.reserveAsGuest, booking)).toBe(active[0]._id);
    else expect(await friend.mutation(api.reservations.reserveGift, { giftId, expectedVersion: 1 })).toBe(active[0]._id);
  });
  test("annullamento dello stesso ospite idempotente e nuova prenotazione disponibile", async () => {
    const { t, booking, guest, token, giftId, secondGuest } = await fixture();
    await t.mutation(api.reservations.reserveAsGuest, booking);
    await t.mutation(api.reservations.cancelAsGuest, { token, secret: guest.secret, giftId });
    await t.mutation(api.reservations.cancelAsGuest, { token, secret: guest.secret, giftId });
    await t.mutation(api.reservations.reserveAsGuest, { ...booking, secret: secondGuest.secret, name: "Marco" });
    await expect(t.mutation(api.reservations.cancelAsGuest, { token, secret: guest.secret, giftId })).rejects.toThrow();
  });
  test("le risposte del proprietario sono identiche prima e dopo una prenotazione ospite", async () => {
    const { t, owner, booking, listId } = await fixture();
    const payload = async () => Promise.all([owner.query(api.lists.getOwnerDetail, { listId }), owner.query(api.lists.getOwned, {}), owner.query(api.guests.listSessions, { listId }), owner.query(api.memberships.list, { listId })]);
    const before = await payload();
    await t.mutation(api.reservations.reserveAsGuest, booking);
    expect(await payload()).toEqual(before);
    expect(JSON.stringify(await payload())).not.toMatch(/Anna|secretDigest|guestName|reservation/);
  });
  test("guest e regalo devono appartenere alla stessa lista", async () => {
    const { t, owner, booking, guest } = await fixture();
    const otherList = await owner.mutation(api.lists.create, { title: "Altra lista", description: "", cover: "plum" });
    const otherGift = await owner.mutation(api.gifts.create, { listId: otherList, title: "Altro", description: "", currency: "EUR", category: "other", priority: "normal", locations: [] });
    const link = await owner.action(api.inviteLinks.create, { listId: otherList });
    expect(await t.query(api.guests.getDetail, { token: link.token, secret: guest.secret })).toEqual({ access: "unavailable" });
    await expect(t.mutation(api.reservations.reserveAsGuest, { ...booking, giftId: otherGift })).rejects.toThrow();
  });
  test("archivio permette la consultazione e l’annullamento ma blocca nuove sessioni e prenotazioni", async () => {
    const { t, booking, listId, guest, token, giftId } = await fixture();
    await t.mutation(api.reservations.reserveAsGuest, booking);
    await t.run(ctx => ctx.db.patch(listId, { status: "archived" }));
    expect(await t.query(api.guests.getDetail, { token, secret: guest.secret })).toMatchObject({ access: "active", detail: { status: "archived" } });
    await t.mutation(api.reservations.cancelAsGuest, { token, secret: guest.secret, giftId });
    await expect(t.mutation(api.reservations.reserveAsGuest, booking)).rejects.toThrow();
    await expect(t.action(api.guestAccess.create, { token })).rejects.toThrow();
  });
  test("regali modificati, rimossi e prenotazioni ospite restano compatibili con avvisi e riepiloghi", async () => {
    const { t, owner, booking, giftId } = await fixture();
    await expect(t.mutation(api.reservations.reserveAsGuest, { ...booking, expectedVersion: 0 })).rejects.toThrow(/cambiato/);
    await t.mutation(api.reservations.reserveAsGuest, booking);
    await owner.mutation(api.gifts.update, { giftId, expectedVersion: 1, title: "Un nuovo libro", description: "", currency: "EUR", category: "books", priority: "normal", locations: [] });
    const notices = await t.run(ctx => ctx.db.query("notices").collect());
    expect(notices[0].guestSessionId).toBeTruthy();
    expect(notices[0].userId).toBeUndefined();
    await owner.mutation(api.gifts.remove, { giftId, expectedVersion: 2 });
    expect((await t.run(ctx => ctx.db.query("reservations").collect()))[0].status).toBe("removed");
    await expect(t.mutation(api.reservations.reserveAsGuest, { ...booking, expectedVersion: 3 })).rejects.toThrow();
  });
  test("account anonimi, estranei e proprietario non prenotano tramite gli endpoint autenticati", async () => {
    const { t, owner, other, giftId } = await fixture();
    for (const actor of [t, owner, other]) {
      await expect(actor.mutation(api.reservations.reserveGift, { giftId, expectedVersion: 1 })).rejects.toThrow();
      await expect(actor.mutation(api.reservations.cancelGift, { giftId })).rejects.toThrow();
    }
  });
  test("la prenotazione con account usa l’identità verificata e può essere annullata dal suo autore", async () => {
    const { t, friend, listId, giftId, guest, token } = await fixture();
    const first = await friend.mutation(api.reservations.reserveGift, { giftId, expectedVersion: 1 });
    expect(await friend.mutation(api.reservations.reserveGift, { giftId, expectedVersion: 1 })).toBe(first);
    expect((await friend.query(api.lists.getParticipantDetail, { listId })).gifts[0].reservation).toEqual({ mine: true, name: "Giulia" });
    const view = await t.query(api.guests.getDetail, { token, secret: guest.secret });
    expect(view.access === "active" && view.detail.gifts[0].reservation).toEqual({ mine: false, name: "Giulia" });
    await friend.mutation(api.reservations.cancelGift, { giftId });
    await friend.mutation(api.reservations.cancelGift, { giftId });
    expect((await friend.query(api.lists.getParticipantDetail, { listId })).gifts[0].reservation).toBeNull();
  });
  test("una partecipazione autenticata revocata non viene aggirata usando gli endpoint ospite", async () => {
    const { friend, owner, token, guest, listId, giftId } = await fixture();
    const [member] = await owner.query(api.memberships.list, { listId });
    await owner.mutation(api.memberships.revoke, { membershipId: member.id });
    await expect(friend.action(api.guestAccess.create, { token })).rejects.toThrow();
    await expect(friend.query(api.guests.getDetail, { token, secret: guest.secret })).rejects.toThrow();
    await expect(friend.mutation(api.reservations.reserveGift, { giftId, expectedVersion: 1 })).rejects.toThrow();
  });
  test("un proprietario disabilitato non rende disponibili nuove sessioni o prenotazioni ospite", async () => {
    const { t, owner, friend, listId, giftId, token, guest, booking } = await fixture();
    const profile = await owner.query(api.profiles.me, {});
    await t.run(ctx => ctx.db.patch(profile.id, { status: "deleted" }));
    await expect(t.action(api.guestAccess.create, { token })).rejects.toThrow();
    await expect(t.query(api.guests.getDetail, { token, secret: guest.secret })).rejects.toThrow();
    await expect(t.mutation(api.reservations.reserveAsGuest, booking)).rejects.toThrow();
    await expect(friend.query(api.lists.getParticipantDetail, { listId })).rejects.toThrow();
    await expect(friend.mutation(api.reservations.reserveGift, { giftId, expectedVersion: 1 })).rejects.toThrow();
  });
});
