import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { previewLimit } from "./previewQuota";

const modules = import.meta.glob("./**/*.ts");

describe("Quota delle anteprime", () => {
  test("richiede un account attivo e limita le richieste per finestra", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(internal.previewQuota.reserve, {})).rejects.toThrow("Accedi per continuare.");
    const owner = t.withIdentity({ subject: "owner", name: "Gabriele" });
    await owner.mutation(api.profiles.ensure, {});
    for (let index = 0; index < previewLimit; index++) await owner.mutation(internal.previewQuota.reserve, {});
    await expect(owner.mutation(internal.previewQuota.reserve, {})).rejects.toThrow("Hai richiesto molte anteprime");
    const friend = t.withIdentity({ subject: "friend", name: "Giulia" });
    await friend.mutation(api.profiles.ensure, {});
    await expect(friend.mutation(internal.previewQuota.reserve, {})).resolves.toBeNull();
    await t.run(async ctx => { for (const quota of await ctx.db.query("previewQuota").collect()) await ctx.db.patch(quota._id, { windowStart: Date.now() - 11 * 60 * 1000 }); });
    await expect(owner.mutation(internal.previewQuota.reserve, {})).resolves.toBeNull();
  });
});
