import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner", name: "Gabriele" });
  const friend = t.withIdentity({ subject: "friend", name: "Giulia" });
  await owner.mutation(api.profiles.ensure, {});
  await friend.mutation(api.profiles.ensure, {});
  const listId = await owner.mutation(api.lists.create, { title: "Compleanno", description: "I miei desideri", cover: "plum" });
  const gift = { title: "Un libro", description: "", currency: "EUR" as const, category: "books" as const, priority: "normal" as const, locations: [] };
  const giftId = await owner.mutation(api.gifts.create, { listId, ...gift });
  const { token } = await owner.action(api.inviteLinks.create, { listId });
  await friend.mutation(api.invites.join, { token });
  return { t, owner, friend, listId, giftId, gift, token };
}

describe("Archiviazione delle liste", () => {
  test("solo il proprietario può archiviare e riattivare", async () => {
    const { t, owner, friend, listId } = await fixture();
    for (const archived of [true, false]) {
      if (!archived) await owner.mutation(api.lists.setArchived, { listId, archived: true });
      for (const actor of [t, friend]) await expect(actor.mutation(api.lists.setArchived, { listId, archived })).rejects.toThrow();
    }
    expect((await owner.query(api.lists.getOwnerDetail, { listId })).list.status).toBe("archived");
  });

  test("archivia e riattiva senza perdere regali, partecipanti, link o prenotazioni", async () => {
    const { t, owner, friend, listId, giftId, gift, token } = await fixture();
    await friend.mutation(api.reservations.reserveGift, { giftId, expectedVersion: 1 });
    const before = await owner.query(api.lists.getOwnerDetail, { listId });
    const reservations = await t.run(ctx => ctx.db.query("reservations").collect());
    await owner.mutation(api.lists.setArchived, { listId, archived: true });
    const archived = await owner.query(api.lists.getOwnerDetail, { listId });
    expect(archived.list).toMatchObject({ status: "archived", title: before.list.title, giftCount: 1 });
    expect(archived.gifts).toEqual(before.gifts);
    expect(await owner.query(api.lists.getOwned, {})).toMatchObject([{ id: listId, status: "archived" }]);
    expect(await friend.query(api.lists.getParticipantDetail, { listId })).toMatchObject({ status: "archived", gifts: [{ reservation: { mine: true } }] });
    expect(await t.run(ctx => ctx.db.query("reservations").collect())).toEqual(reservations);
    expect(await owner.query(api.invites.getOwnerLink, { listId })).toEqual({ token });
    await expect(owner.mutation(api.gifts.create, { listId, ...gift })).rejects.toThrow(/Riattiva/);
    await expect(friend.mutation(api.reservations.reserveGift, { giftId, expectedVersion: 1 })).rejects.toThrow();
    await owner.mutation(api.lists.setArchived, { listId, archived: true });
    expect((await owner.query(api.lists.getOwnerDetail, { listId })).list).toEqual(archived.list);
    await friend.mutation(api.reservations.cancelGift, { giftId });
    await owner.mutation(api.lists.setArchived, { listId, archived: false });
    expect(await owner.query(api.lists.getOwned, {})).toMatchObject([{ id: listId, status: "active" }]);
    await friend.mutation(api.reservations.reserveGift, { giftId, expectedVersion: 1 });
    await owner.mutation(api.gifts.create, { listId, ...gift });
    expect((await owner.query(api.lists.getOwnerDetail, { listId })).gifts).toHaveLength(2);
    expect(await t.query(api.invites.preview, { token })).toMatchObject({ archived: false });
  });
});
