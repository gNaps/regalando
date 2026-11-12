import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { betaGiftLimitMessage, betaImportLimitMessage, betaListLimitMessage } from "../lib/beta-limits";

const modules = import.meta.glob("./**/*.ts");
const listValues = { title: "Compleanno", description: "", cover: "plum" as const };
const giftValues = { title: "Regalo", description: "", currency: "EUR" as const, category: "other" as const, priority: "normal" as const, locations: [] };
const json = (count = 1) => JSON.stringify({ title: "Importata", gifts: Array.from({ length: count }, () => ({ title: "Regalo" })) });

async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner", name: "Gabriele" });
  await owner.mutation(api.profiles.ensure, {});
  return { t, owner };
}

describe("Limiti del piano gratuito durante la beta", () => {
  test("la quarta lista è bloccata in ogni percorso, anche contando le archiviate", async () => {
    const { t, owner } = await fixture();
    const first = await owner.mutation(api.lists.create, listValues);
    await owner.mutation(api.lists.setArchived, { listId: first, archived: true });
    await owner.action(api.listEditor.save, listValues);
    await owner.mutation(api.lists.importJson, { json: json() });
    for (const attempt of [
      () => owner.mutation(api.lists.create, listValues),
      () => owner.action(api.listEditor.save, listValues),
      () => owner.mutation(api.lists.importJson, { json: json() }),
    ]) await expect(attempt()).rejects.toThrow(betaListLimitMessage);
    expect(await owner.query(api.lists.getOwned, {})).toHaveLength(3);
    const other = t.withIdentity({ subject: "other", name: "Giulia" });
    await other.mutation(api.profiles.ensure, {});
    await expect(other.mutation(api.lists.create, listValues)).resolves.toBeTruthy();
  });

  test("ricontrolla la capienza al salvataggio se l’ultimo posto è stato occupato dopo prepare", async () => {
    const { t, owner } = await fixture();
    await owner.mutation(api.lists.create, listValues);
    await owner.mutation(api.lists.create, listValues);
    await owner.mutation(internal.listEditor.prepare, { ...listValues, uploading: false });
    const id = await owner.mutation(api.lists.create, listValues);
    await expect(owner.mutation(internal.listEditor.persist, { ...listValues, removeImage: false })).rejects.toThrow(betaListLimitMessage);
    const args = { ...giftValues, listId: id };
    for (let index = 0; index < 14; index++) await owner.mutation(api.gifts.create, args);
    await owner.mutation(internal.giftEditor.prepare, { ...args, uploading: false });
    await owner.mutation(api.gifts.create, args);
    await expect(owner.mutation(internal.giftEditor.persist, { ...args, removeImage: false })).rejects.toThrow(betaGiftLimitMessage);
    expect(await t.run(ctx => ctx.db.query("lists").collect())).toHaveLength(3);
    expect((await owner.query(api.lists.getOwnerDetail, { listId: id })).gifts).toHaveLength(15);
  });

  test("15 regali consentiti, sedicesimo bloccato; modifica e rimozione restano disponibili", async () => {
    const { t, owner } = await fixture();
    const listId = await owner.mutation(api.lists.importJson, { json: json(15) });
    const args = { listId, ...giftValues };
    // A legacy or stale counter must not permit creating an extra gift.
    await t.run(ctx => ctx.db.patch(listId, { giftCount: 0 }));
    await expect(owner.mutation(api.gifts.create, args)).rejects.toThrow(betaGiftLimitMessage);
    await expect(owner.action(api.giftEditor.save, args)).rejects.toThrow(betaGiftLimitMessage);
    const [gift] = (await owner.query(api.lists.getOwnerDetail, { listId })).gifts;
    await owner.action(api.giftEditor.save, { ...args, title: "Modificato", giftId: gift._id, expectedVersion: 1 });
    await owner.action(api.listEditor.save, { ...listValues, listId, title: "Nuovo titolo" });
    await owner.mutation(api.gifts.remove, { giftId: gift._id, expectedVersion: 2 });
    await owner.action(api.giftEditor.save, args);
    const detail = await owner.query(api.lists.getOwnerDetail, { listId });
    expect(detail.list).toMatchObject({ title: "Nuovo titolo", giftCount: 15 });
    expect(detail.gifts).toHaveLength(15);
    await expect(owner.mutation(api.gifts.create, args)).rejects.toThrow(betaGiftLimitMessage);
  });

  test("un JSON con 16 regali non salva alcun elemento", async () => {
    const { t, owner } = await fixture();
    await expect(owner.mutation(api.lists.importJson, { json: json(16) })).rejects.toThrow(betaImportLimitMessage);
    expect(await t.run(ctx => ctx.db.query("lists").collect())).toEqual([]);
    expect(await t.run(ctx => ctx.db.query("gifts").collect())).toEqual([]);
  });

  test("i dati preesistenti oltre soglia restano leggibili e modificabili", async () => {
    const { t, owner } = await fixture();
    const listId = await owner.mutation(api.lists.importJson, { json: json(15) });
    await t.run(async ctx => {
      const list = (await ctx.db.get(listId))!;
      for (let index = 0; index < 3; index++) await ctx.db.insert("lists", { ...listValues, ownerId: list.ownerId, status: "active", updatedAt: 1 });
      await ctx.db.insert("gifts", { ...giftValues, listId, removed: false, version: 1, updatedAt: 1 });
    });
    await owner.action(api.listEditor.save, { ...listValues, listId, title: "Lista esistente" });
    const before = await owner.query(api.lists.getOwnerDetail, { listId });
    const gift = before.gifts[0];
    await owner.mutation(api.gifts.update, { ...giftValues, giftId: gift._id, expectedVersion: 1, title: "Regalo esistente" });
    expect(await owner.query(api.lists.getOwned, {})).toHaveLength(4);
    expect((await owner.query(api.lists.getOwnerDetail, { listId })).gifts).toHaveLength(16);
    await expect(owner.mutation(api.lists.create, listValues)).rejects.toThrow(betaListLimitMessage);
    await expect(owner.mutation(api.gifts.create, { ...giftValues, listId })).rejects.toThrow(betaGiftLimitMessage);
  });
});
