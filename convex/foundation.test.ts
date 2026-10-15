import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";
import { giftCategories } from "../lib/domain";

const modules = import.meta.glob("./**/*.ts");

async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner", name: "Gabriele" });
  const friend = t.withIdentity({ subject: "friend", name: "Giulia" });
  const stranger = t.withIdentity({ subject: "stranger", name: "Estraneo" });
  const ownerId = await owner.mutation(api.profiles.ensure, {});
  const friendId = await friend.mutation(api.profiles.ensure, {});
  await stranger.mutation(api.profiles.ensure, {});
  const listId = await owner.mutation(api.lists.create, { title: "Compleanno", description: "Desideri", cover: "plum" });
  const giftId = await owner.mutation(api.gifts.create, { listId, title: "Un libro", description: "Una dedica", currency: "EUR", category: "books", priority: "normal", locations: [], priceCents: 2000 });
  const membershipId = await t.run(ctx => ctx.db.insert("memberships", { listId, userId: friendId, status: "active", joinedAt: Date.now() }));
  await t.run(async ctx => {
    await ctx.db.insert("reservations", { listId, giftId, userId: friendId, status: "active", snapshot: { title: "Un libro", description: "Una dedica", currency: "EUR", category: "books", priority: "normal", locations: [], priceCents: 2000 }, giftVersion: 1, updatedAt: Date.now() });
  });
  return { t, owner, friend, stranger, ownerId, friendId, listId, giftId, membershipId };
}

describe("Identità e accessi", () => {
  test("creazione profilo autenticata e idempotente", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.profiles.ensure, {})).rejects.toThrow();
    const viewer = t.withIdentity({ subject: "user", name: "Giulia" });
    const first = await viewer.mutation(api.profiles.ensure, {});
    expect(await viewer.mutation(api.profiles.ensure, {})).toBe(first);
    expect(await t.run(ctx => ctx.db.query("users").collect())).toHaveLength(1);
  });

  test("solo il proprietario può leggere la propria vista", async () => {
    const { t, friend, stranger, listId } = await fixture();
    await expect(t.query(api.lists.getOwnerDetail, { listId })).rejects.toThrow();
    await expect(friend.query(api.lists.getOwnerDetail, { listId })).rejects.toThrow();
    await expect(stranger.query(api.lists.getOwnerDetail, { listId })).rejects.toThrow();
  });

  test("il proprietario non accede alla vista partecipanti", async () => {
    const { owner, stranger, listId } = await fixture();
    await expect(owner.query(api.lists.getParticipantDetail, { listId })).rejects.toThrow();
    await expect(stranger.query(api.lists.getParticipantDetail, { listId })).rejects.toThrow();
  });

  test("nessun dato di prenotazione nelle risposte proprietario", async () => {
    const { owner, listId } = await fixture();
    const detail = await owner.query(api.lists.getOwnerDetail, { listId });
    const owned = await owner.query(api.lists.getOwned, {});
    expect(detail.gifts).toHaveLength(1);
    expect(owned[0].giftCount).toBe(1);
    for (const payload of [detail, owned]) {
      const serialized = JSON.stringify(payload);
      expect(serialized).not.toMatch(/reservation|booked|Giulia|friend/);
    }
  });

  test("un amico vede il nome, senza identità Clerk o email", async () => {
    const { friend, listId } = await fixture();
    const result = await friend.query(api.lists.getParticipantDetail, { listId });
    expect(result.gifts[0].reservation).toEqual({ mine: true, name: "Giulia" });
    expect(JSON.stringify(result)).not.toContain("clerkId");
    expect(JSON.stringify(result)).not.toContain("email");
  });

  test("la revoca blocca immediatamente la lettura", async () => {
    const { t, friend, membershipId, listId } = await fixture();
    await t.run(ctx => ctx.db.patch(membershipId, { status: "revoked" }));
    await expect(friend.query(api.lists.getParticipantDetail, { listId })).rejects.toThrow();
  });

  test("un amico non può aggiungere regali alla lista altrui", async () => {
    const { friend, listId } = await fixture();
    await expect(friend.mutation(api.gifts.create, { listId, title: "Intruso", description: "", currency: "EUR", category: "other", priority: "normal", locations: [] })).rejects.toThrow();
  });

  test("lista archiviata, URL pericoloso e prezzo invalido rifiutati", async () => {
    const { t, owner, listId } = await fixture();
    const args = { listId, title: "Un regalo", description: "", currency: "EUR" as const, category: "other" as const, priority: "normal" as const, locations: [] };
    await expect(owner.mutation(api.gifts.create, { ...args, priceCents: -1 })).rejects.toThrow();
    await expect(owner.mutation(api.gifts.create, { ...args, locations: [{ kind: "online", url: "javascript:alert(1)" }] })).rejects.toThrow();
    await t.run(ctx => ctx.db.patch(listId, { status: "archived" }));
    await expect(owner.mutation(api.gifts.create, args)).rejects.toThrow();
  });
});

describe("Profili e conteggi", () => {
  test("tutte le nuove categorie si possono salvare e rileggere senza perdere i regali esistenti", async () => {
    const { owner, listId } = await fixture();
    for (const giftCategory of Object.keys(giftCategories) as (keyof typeof giftCategories)[]) {
      await owner.mutation(api.gifts.create, { listId, title: giftCategories[giftCategory], description: "", currency: "EUR", category: giftCategory, priority: "normal", locations: [] });
    }
    const detail = await owner.query(api.lists.getOwnerDetail, { listId });
    expect(detail.gifts).toHaveLength(11);
    expect(detail.gifts.map(gift => gift.category)).toContain("books");
    expect(new Set(detail.gifts.map(gift => gift.category))).toEqual(new Set(["books", ...Object.keys(giftCategories)]));
  });

  test("nome vuoto da Clerk non sovrascrive il profilo", async () => {
    const t = convexTest(schema, modules);
    const id = await t.withIdentity({ subject: "u", name: "Giulia" }).mutation(api.profiles.ensure, {});
    await t.withIdentity({ subject: "u", name: "" }).mutation(api.profiles.ensure, {});
    expect((await t.run(ctx => ctx.db.get(id)))?.name).toBe("Giulia");
    const anon = await t.withIdentity({ subject: "v", name: "  " }).mutation(api.profiles.ensure, {});
    expect((await t.run(ctx => ctx.db.get(anon)))?.name).toBe("Un amico");
  });

  test("il conteggio regali segue le aggiunte, anche su liste senza contatore", async () => {
    const { t, owner, listId } = await fixture();
    const args = { listId, title: "Altro", description: "", currency: "EUR" as const, category: "other" as const, priority: "normal" as const, locations: [] };
    await owner.mutation(api.gifts.create, args);
    expect((await owner.query(api.lists.getOwned, {}))[0].giftCount).toBe(2);
    await t.run(ctx => ctx.db.patch(listId, { giftCount: undefined }));
    await owner.mutation(api.gifts.create, args);
    expect((await owner.query(api.lists.getOwned, {}))[0].giftCount).toBe(3);
  });
});

describe("Modifica e rimozione dei regali", () => {
  const fields = { title: "Un nuovo libro", description: "Edizione aggiornata", currency: "EUR" as const, category: "books" as const, priority: "favorite" as const, priceCents: 2500, locations: [{ kind: "physical" as const, name: "Libreria", address: "Milano" }] };

  test("anonimo, partecipante ed estraneo non possono modificare o rimuovere", async () => {
    const { t, friend, stranger, giftId } = await fixture();
    for (const viewer of [t, friend, stranger]) {
      await expect(viewer.mutation(api.gifts.update, { giftId, expectedVersion: 1, ...fields })).rejects.toThrow();
      await expect(viewer.mutation(api.gifts.remove, { giftId, expectedVersion: 1 })).rejects.toThrow();
    }
    const gift = await t.run(ctx => ctx.db.get(giftId));
    expect(gift).toMatchObject({ title: "Un libro", version: 1, removed: false });
    expect(await t.run(ctx => ctx.db.query("notices").collect())).toHaveLength(0);
  });

  test("essere proprietario di un’altra lista non dà accesso al regalo", async () => {
    const { t, stranger, giftId } = await fixture();
    await stranger.mutation(api.lists.create, { title: "La mia lista", description: "", cover: "sand" });
    await expect(stranger.mutation(api.gifts.update, { giftId, expectedVersion: 1, ...fields })).rejects.toThrow();
    await expect(stranger.mutation(api.gifts.remove, { giftId, expectedVersion: 1 })).rejects.toThrow();
    expect((await t.run(ctx => ctx.db.get(giftId)))?.version).toBe(1);
  });

  test("proprietario disattivato e lista archiviata bloccano entrambe le operazioni", async () => {
    const { t, owner, ownerId, listId, giftId } = await fixture();
    await t.run(ctx => ctx.db.patch(ownerId, { status: "deleted" }));
    await expect(owner.mutation(api.gifts.update, { giftId, expectedVersion: 1, ...fields })).rejects.toThrow();
    await expect(owner.mutation(api.gifts.remove, { giftId, expectedVersion: 1 })).rejects.toThrow();
    await t.run(async ctx => { await ctx.db.patch(ownerId, { status: "active" }); await ctx.db.patch(listId, { status: "archived" }); });
    await expect(owner.mutation(api.gifts.update, { giftId, expectedVersion: 1, ...fields })).rejects.toThrow();
    await expect(owner.mutation(api.gifts.remove, { giftId, expectedVersion: 1 })).rejects.toThrow();
    expect((await t.run(ctx => ctx.db.get(giftId)))?.removed).toBe(false);
  });

  test("modifica autorizzata aggiorna snapshot e avviso senza rivelare prenotazioni", async () => {
    const { t, owner, friendId, listId, giftId } = await fixture();
    const result = await owner.mutation(api.gifts.update, { giftId, expectedVersion: 1, ...fields });
    expect(result).toBe(giftId);
    const detail = await owner.query(api.lists.getOwnerDetail, { listId });
    expect(detail.gifts[0]).toMatchObject({ ...fields, version: 2, removed: false });
    expect((await owner.query(api.lists.getOwned, {}))[0].giftCount).toBe(1);
    const reservation = (await t.run(ctx => ctx.db.query("reservations").collect()))[0];
    expect(reservation).toMatchObject({ status: "active", giftVersion: 2, snapshot: fields });
    const notices = await t.run(ctx => ctx.db.query("notices").collect());
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ userId: friendId, kind: "changed", version: 2, previousSnapshot: { title: "Un libro", priceCents: 2000 } });
    expect(JSON.stringify({ result, detail })).not.toMatch(/reservation|booked|Giulia|friend/);
  });

  test("versioni obsolete non sovrascrivono né eliminano modifiche più recenti", async () => {
    const { t, owner, giftId } = await fixture();
    await owner.mutation(api.gifts.update, { giftId, expectedVersion: 1, ...fields });
    await expect(owner.mutation(api.gifts.update, { giftId, expectedVersion: 1, ...fields, title: "Vecchio modulo" })).rejects.toThrow("Il regalo è cambiato");
    await expect(owner.mutation(api.gifts.remove, { giftId, expectedVersion: 1 })).rejects.toThrow("Il regalo è cambiato");
    expect(await t.run(ctx => ctx.db.get(giftId))).toMatchObject({ title: fields.title, version: 2, removed: false });
    expect(await t.run(ctx => ctx.db.query("notices").collect())).toHaveLength(1);
  });

  test("campi invalidi non producono aggiornamenti parziali", async () => {
    const { t, owner, giftId } = await fixture();
    for (const invalid of [{ title: " " }, { title: "x".repeat(151) }, { priceCents: -1 }, { priceCents: 1.5 }, { priceCents: 100_000_001 }, { locations: [{ kind: "online" as const, url: "javascript:alert(1)" }] }, { locations: [{ kind: "physical" as const, name: " " }] }, { locations: Array.from({ length: 6 }, () => ({ kind: "online" as const, url: "https://example.com" })) }]) {
      await expect(owner.mutation(api.gifts.update, { giftId, expectedVersion: 1, ...fields, ...invalid })).rejects.toThrow();
    }
    expect(await t.run(ctx => ctx.db.get(giftId))).toMatchObject({ title: "Un libro", priceCents: 2000, version: 1 });
    expect(await t.run(ctx => ctx.db.query("notices").collect())).toHaveLength(0);
    await owner.mutation(api.gifts.update, { giftId, expectedVersion: 1, ...fields, priceCents: undefined });
    expect((await t.run(ctx => ctx.db.get(giftId)))?.priceCents).toBeUndefined();
  });

  test("rimozione nasconde il regalo, aggiorna il conteggio e conserva il riepilogo", async () => {
    const { t, owner, friend, listId, giftId } = await fixture();
    expect(await owner.mutation(api.gifts.remove, { giftId, expectedVersion: 1 })).toBe(giftId);
    expect((await owner.query(api.lists.getOwnerDetail, { listId })).gifts).toHaveLength(0);
    expect((await friend.query(api.lists.getParticipantDetail, { listId })).gifts).toHaveLength(0);
    expect((await owner.query(api.lists.getOwned, {}))[0].giftCount).toBe(0);
    const reservation = (await t.run(ctx => ctx.db.query("reservations").collect()))[0];
    expect(reservation).toMatchObject({ status: "removed", giftVersion: 2, snapshot: { title: "Un libro", priceCents: 2000 } });
    expect(await t.run(ctx => ctx.db.query("notices").collect())).toMatchObject([{ kind: "removed", version: 2 }]);
    await expect(owner.mutation(api.gifts.update, { giftId, expectedVersion: 2, ...fields })).rejects.toThrow();
    expect(await owner.mutation(api.gifts.remove, { giftId, expectedVersion: 1 })).toBe(giftId);
    expect((await owner.query(api.lists.getOwned, {}))[0].giftCount).toBe(0);
    expect(await t.run(ctx => ctx.db.query("notices").collect())).toHaveLength(1);
    // An unauthorized retry is still rejected even though the gift is already removed.
    await expect(friend.mutation(api.gifts.remove, { giftId, expectedVersion: 1 })).rejects.toThrow();
  });

  test("conteggio delle liste precedenti corretto anche senza contatore", async () => {
    const { t, owner, listId, giftId } = await fixture();
    await owner.mutation(api.gifts.create, { listId, ...fields });
    await t.run(ctx => ctx.db.patch(listId, { giftCount: undefined }));
    await owner.mutation(api.gifts.remove, { giftId, expectedVersion: 1 });
    expect((await owner.query(api.lists.getOwned, {}))[0].giftCount).toBe(1);
  });
});
