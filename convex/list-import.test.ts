import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");
const payload = {
  title: "  Desideri importati  ", description: "Una nuova lista", cover: "sage", date: "2027-06-15",
  gifts: [{ title: "Cuffie", priceCents: 12500, category: "tech", priority: "favorite" }, { title: "Un vaso", locations: [{ kind: "physical", name: "Bottega" }] }],
};

async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner", name: "Gabriele" });
  await owner.mutation(api.profiles.ensure, {});
  return { t, owner };
}

describe("Salvataggio di una lista importata", () => {
  test("salva lista e regali per l’utente autenticato con conteggi e versioni coerenti", async () => {
    const { t, owner } = await fixture();
    const id = await owner.mutation(api.lists.importJson, { json: JSON.stringify(payload) });
    const result = await owner.query(api.lists.getOwnerDetail, { listId: id });
    expect(result.list).toMatchObject({ title: "Desideri importati", cover: "sage", date: "2027-06-15", status: "active", giftCount: 2 });
    expect(result.gifts).toMatchObject([
      { listId: id, title: "Cuffie", priceCents: 12500, currency: "EUR", category: "tech", priority: "favorite", version: 1, removed: false },
      { listId: id, title: "Un vaso", locations: [{ kind: "physical", name: "Bottega" }], version: 1, removed: false },
    ]);
    expect(await owner.query(api.lists.getOwned, {})).toMatchObject([{ id, giftCount: 2 }]);
    for (const table of ["reservations", "memberships", "invites"] as const) expect(await t.run(ctx => ctx.db.query(table).collect())).toEqual([]);
    const stranger = t.withIdentity({ subject: "stranger", name: "Giulia" });
    await stranger.mutation(api.profiles.ensure, {});
    await expect(stranger.query(api.lists.getOwnerDetail, { listId: id })).rejects.toThrow("Lista non disponibile");
  });

  test("un errore nell’ultimo regalo non crea né lista né regali e conserva le liste esistenti", async () => {
    const { t, owner } = await fixture();
    const existing = await owner.mutation(api.lists.create, { title: "Esistente", description: "", cover: "plum" });
    await expect(owner.mutation(api.lists.importJson, { json: JSON.stringify({ ...payload, gifts: [...payload.gifts, { title: "", priceCents: -1 }] }) })).rejects.toThrow();
    expect((await t.run(ctx => ctx.db.query("lists").collect())).map(list => list._id)).toEqual([existing]);
    expect(await t.run(ctx => ctx.db.query("gifts").collect())).toEqual([]);
  });

  test("richiede un account attivo e rifiuta proprietari o identificativi forniti nel file", async () => {
    const { t, owner } = await fixture();
    await expect(t.mutation(api.lists.importJson, { json: JSON.stringify(payload) })).rejects.toThrow("Accedi");
    const missing = t.withIdentity({ subject: "missing" });
    await expect(missing.mutation(api.lists.importJson, { json: JSON.stringify(payload) })).rejects.toThrow("Account non disponibile");
    await expect(owner.mutation(api.lists.importJson, { json: JSON.stringify({ ...payload, ownerId: "other" }) })).rejects.toThrow();
    await t.run(async ctx => { const user = await ctx.db.query("users").first(); await ctx.db.patch(user!._id, { status: "deleted" }); });
    await expect(owner.mutation(api.lists.importJson, { json: JSON.stringify(payload) })).rejects.toThrow("Account non disponibile");
    expect(await t.run(ctx => ctx.db.query("lists").collect())).toEqual([]);
  });

  test("ogni importazione crea una lista nuova, anche se il titolo esiste già", async () => {
    const { owner } = await fixture();
    const first = await owner.mutation(api.lists.importJson, { json: JSON.stringify(payload) });
    const second = await owner.mutation(api.lists.importJson, { json: JSON.stringify(payload) });
    expect(second).not.toBe(first);
    expect(await owner.query(api.lists.getOwned, {})).toHaveLength(2);
  });
});
