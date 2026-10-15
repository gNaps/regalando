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
  const stranger = t.withIdentity({ subject: "stranger", name: "Marco" });
  const ownerId = await owner.mutation(api.profiles.ensure, {});
  const friendId = await friend.mutation(api.profiles.ensure, {});
  await stranger.mutation(api.profiles.ensure, {});
  const listId = await owner.mutation(api.lists.create, { title: "Compleanno", description: "Descrizione privata", cover: "sand" });
  const giftId = await owner.mutation(api.gifts.create, { listId, title: "Regalo privato", description: "", currency: "EUR", category: "tech", priority: "normal", locations: [] });
  const { token } = await owner.action(api.inviteLinks.create, { listId });
  return { t, owner, friend, stranger, ownerId, friendId, listId, giftId, token };
}

describe("Link di invito", () => {
  test("token casuale, digest e condivisioni ripetute conservano un solo link attivo", async () => {
    const { t, owner, listId, token } = await fixture();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await owner.action(api.inviteLinks.create, { listId })).toEqual({ token });
    const invites = await t.run(ctx => ctx.db.query("invites").collect());
    expect(invites).toHaveLength(1);
    expect(invites[0].digest).toBe(await tokenDigest(token));
    expect(invites[0].digest).not.toContain(token);
    expect(await owner.query(api.invites.getOwnerLink, { listId })).toEqual({ token });
  });

  test("anonimi, amici ed estranei non gestiscono link né partecipanti", async () => {
    const { t, friend, stranger, listId } = await fixture();
    for (const actor of [t, friend, stranger]) {
      await expect(actor.action(api.inviteLinks.create, { listId })).rejects.toThrow();
      await expect(actor.action(api.inviteLinks.rotate, { listId })).rejects.toThrow();
      await expect(actor.query(api.invites.getOwnerLink, { listId })).rejects.toThrow();
      await expect(actor.mutation(api.invites.disable, { listId })).rejects.toThrow();
      await expect(actor.query(api.memberships.list, { listId })).rejects.toThrow();
    }
  });

  test("l’anteprima pubblica non espone regali, descrizione, membri o ID interni", async () => {
    const { t, owner, listId, giftId, token, friend } = await fixture();
    await friend.mutation(api.invites.join, { token });
    const preview = await t.query(api.invites.preview, { token });
    expect(preview).toMatchObject({ title: "Compleanno", ownerName: "Gabriele", access: "guest", archived: false });
    const json = JSON.stringify(preview);
    for (const secret of ["Descrizione privata", "Regalo privato", "Giulia", listId, giftId, token, "digest", "reservation", "clerkId"]) expect(json).not.toContain(secret);
    const ownerPreview = await owner.query(api.invites.preview, { token });
    expect(ownerPreview).toMatchObject({ access: "owner", listId });
  });

  test("rotazione e disattivazione bloccano nuovi ingressi ma mantengono gli accessi esistenti", async () => {
    const { t, owner, friend, stranger, listId, token } = await fixture();
    await friend.mutation(api.invites.join, { token });
    const next = await owner.action(api.inviteLinks.rotate, { listId });
    expect(next.token).not.toBe(token);
    expect(await t.query(api.invites.preview, { token })).toBeNull();
    await expect(stranger.mutation(api.invites.join, { token })).rejects.toThrow();
    expect(await friend.query(api.lists.getAccess, { listId })).toBe("participant");
    await owner.mutation(api.invites.disable, { listId });
    await owner.mutation(api.invites.disable, { listId });
    expect(await owner.query(api.invites.getOwnerLink, { listId })).toBeNull();
    expect(await t.query(api.invites.preview, { token: next.token })).toBeNull();
    await expect(stranger.mutation(api.invites.join, { token: next.token })).rejects.toThrow();
    expect(await friend.query(api.lists.getParticipantDetail, { listId })).toBeTruthy();
    const newLink = await owner.action(api.inviteLinks.create, { listId });
    expect(newLink.token).not.toBe(next.token);
  });

  test("link inesistenti e malformati hanno la stessa anteprima generica", async () => {
    const { t } = await fixture();
    for (const token of ["", "a", "/lists", "A".repeat(43), "!".repeat(43), "A".repeat(1000)]) expect(await t.query(api.invites.preview, { token })).toBeNull();
  });

  test("ingressi ripetuti e simultanei creano una sola partecipazione", async () => {
    const { t, owner, friend, listId, token } = await fixture();
    await expect(t.mutation(api.invites.join, { token })).rejects.toThrow();
    expect(await owner.mutation(api.invites.join, { token })).toBe(listId);
    expect(await Promise.all([friend.mutation(api.invites.join, { token }), friend.mutation(api.invites.join, { token })])).toEqual([listId, listId]);
    expect(await friend.mutation(api.invites.join, { token })).toBe(listId);
    expect(await t.run(ctx => ctx.db.query("memberships").collect())).toHaveLength(1);
    expect(await friend.query(api.invites.preview, { token })).toMatchObject({ access: "joined", listId });
    expect(await friend.query(api.lists.getJoined, {})).toMatchObject([{ id: listId, owner: "Gabriele", giftCount: 1 }]);
    expect(await owner.query(api.lists.getJoined, {})).toEqual([]);
  });

  test("l’archivio impedisce nuovi ingressi e link, conservando la lettura degli amici", async () => {
    const { t, owner, friend, stranger, listId, token } = await fixture();
    await friend.mutation(api.invites.join, { token });
    await t.run(ctx => ctx.db.patch(listId, { status: "archived" }));
    expect(await t.query(api.invites.preview, { token })).toMatchObject({ archived: true });
    await expect(stranger.mutation(api.invites.join, { token })).rejects.toThrow(/archiviata/);
    await expect(owner.action(api.inviteLinks.create, { listId })).rejects.toThrow();
    await expect(owner.action(api.inviteLinks.rotate, { listId })).rejects.toThrow();
    expect(await friend.mutation(api.invites.join, { token })).toBe(listId);
    expect((await friend.query(api.lists.getJoined, {}))[0].status).toBe("archived");
  });

  test("account disabilitati non entrano; l’invito di un proprietario eliminato è indisponibile", async () => {
    const { t, ownerId, friendId, friend, token } = await fixture();
    await t.run(ctx => ctx.db.patch(friendId, { status: "deleted" }));
    await expect(friend.mutation(api.invites.join, { token })).rejects.toThrow();
    await t.run(ctx => ctx.db.patch(ownerId, { status: "deleted" }));
    expect(await t.query(api.invites.preview, { token })).toBeNull();
  });
});

describe("Partecipanti e sorpresa", () => {
  test("revoca blocca vista, elenco amici e rientro; la riabilitazione ripristina l’accesso", async () => {
    const { t, owner, friend, stranger, listId, token } = await fixture();
    await friend.mutation(api.invites.join, { token });
    const [member] = await owner.query(api.memberships.list, { listId });
    for (const actor of [t, friend, stranger]) {
      await expect(actor.mutation(api.memberships.revoke, { membershipId: member.id })).rejects.toThrow();
      await expect(actor.mutation(api.memberships.restore, { membershipId: member.id })).rejects.toThrow();
    }
    await owner.mutation(api.memberships.revoke, { membershipId: member.id });
    await owner.mutation(api.memberships.revoke, { membershipId: member.id });
    expect(await friend.query(api.lists.getAccess, { listId })).toBe("unavailable");
    expect(await friend.query(api.lists.getJoined, {})).toEqual([]);
    await expect(friend.query(api.lists.getParticipantDetail, { listId })).rejects.toThrow();
    await expect(friend.mutation(api.invites.join, { token })).rejects.toThrow(/riabilitarti/);
    const next = await owner.action(api.inviteLinks.rotate, { listId });
    await expect(friend.mutation(api.invites.join, { token: next.token })).rejects.toThrow(/riabilitarti/);
    expect(await friend.query(api.invites.preview, { token: next.token })).toMatchObject({ access: "revoked" });
    await owner.mutation(api.memberships.restore, { membershipId: member.id });
    await owner.mutation(api.memberships.restore, { membershipId: member.id });
    expect(await friend.query(api.lists.getAccess, { listId })).toBe("participant");
  });

  test("la revoca libera solo le prenotazioni di quella lista senza rivelarle al proprietario", async () => {
    const { t, owner, friend, friendId, listId, giftId, token } = await fixture();
    await friend.mutation(api.invites.join, { token });
    const otherListId = await owner.mutation(api.lists.create, { title: "Altra lista", description: "", cover: "sage" });
    const snapshot = { title: "Segreto", description: "", currency: "EUR" as const, category: "other" as const, priority: "normal" as const, locations: [] };
    const ids = await t.run(async ctx => Promise.all([listId, otherListId].map(id => ctx.db.insert("reservations", { listId: id, giftId, userId: friendId, status: "active", snapshot, giftVersion: 1, updatedAt: 1 }))));
    const before = await owner.query(api.memberships.list, { listId });
    expect(JSON.stringify(before)).not.toMatch(/reservation|clerkId|email|Segreto/);
    const result = await owner.mutation(api.memberships.revoke, { membershipId: before[0].id });
    expect(result).toBeNull();
    expect((await t.run(ctx => ctx.db.get(ids[0])))?.status).toBe("cancelled");
    expect((await t.run(ctx => ctx.db.get(ids[1])))?.status).toBe("active");
    await owner.mutation(api.memberships.restore, { membershipId: before[0].id });
    expect((await t.run(ctx => ctx.db.get(ids[0])))?.status).toBe("cancelled");
    expect(JSON.stringify(await owner.query(api.lists.getOwnerDetail, { listId }))).not.toMatch(/reservation|Segreto/);
  });

  test("le operazioni ricavano il proprietario dal partecipante memorizzato", async () => {
    const { owner, friend, token } = await fixture();
    await friend.mutation(api.invites.join, { token });
    const ownList = await friend.mutation(api.lists.create, { title: "Lista di Giulia", description: "", cover: "sage" });
    const preview = await friend.query(api.invites.preview, { token });
    const [member] = await owner.query(api.memberships.list, { listId: preview!.listId! });
    await expect(friend.mutation(api.memberships.revoke, { membershipId: member.id })).rejects.toThrow();
    expect(await friend.query(api.memberships.list, { listId: ownList })).toEqual([]);
  });
});
