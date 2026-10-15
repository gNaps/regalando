import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const signingKey = Buffer.from("regalando-webhook-test-only-key");
const signingSecret = `whsec_${signingKey.toString("base64")}`;
const path = "/clerk-users-webhook";

function signed(event: unknown, options: { timestamp?: number; key?: Buffer } = {}): RequestInit {
  const body = JSON.stringify(event);
  const id = "msg_test_delivery";
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", options.key ?? signingKey).update(`${id}.${timestamp}.${body}`).digest("base64");
  return { method: "POST", body, headers: { "content-type": "application/json", "svix-id": id, "svix-timestamp": String(timestamp), "svix-signature": `v1,${signature}` } };
}

function profile(type = "user.updated", data = {}, timestamp = 1000) {
  return { type, object: "event", timestamp, instance_id: "ins_test", data: { id: "user_test", first_name: "Giulia", last_name: "Rossi", username: null, image_url: "https://example.com/avatar.png", updated_at: timestamp, ...data } };
}

beforeEach(() => vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", signingSecret));
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("Webhook Clerk firmati", () => {
  test("creazione e aggiornamento funzionano via HTTP senza sessione e senza duplicare utenti", async () => {
    const t = convexTest(schema, modules);
    const event = profile("user.created");
    expect((await t.fetch(path, signed(event))).status).toBe(204);
    const first = (await t.run(ctx => ctx.db.query("users").collect()))[0];
    expect(first).toMatchObject({ clerkId: "user_test", name: "Giulia Rossi", status: "active", clerkUpdatedAt: 1000 });
    expect((await t.fetch(path, signed(event))).status).toBe(204);
    expect(await t.run(ctx => ctx.db.query("users").collect())).toEqual([first]);
    expect((await t.fetch(path, signed(profile("user.updated", { first_name: "Ada", image_url: null }, 2000)))).status).toBe(204);
    const updated = await t.run(ctx => ctx.db.get(first._id));
    expect(updated).toMatchObject({ name: "Ada Rossi", clerkUpdatedAt: 2000 });
    expect(updated?.avatarUrl).toBeUndefined();
    // An older session cannot undo the profile received from the verified webhook.
    await t.withIdentity({ subject: "user_test", name: "Nome precedente", pictureUrl: "https://example.com/old.png" }).mutation(api.profiles.ensure, {});
    expect(await t.run(ctx => ctx.db.get(first._id))).toEqual(updated);
    expect(JSON.stringify(updated)).not.toMatch(/email_addresses|private_metadata|svix/);
  });

  test("rifiuta firma assente, errata, scaduta e corpo alterato senza scrivere", async () => {
    const t = convexTest(schema, modules);
    const event = profile();
    const tampered = signed(event);
    tampered.body = JSON.stringify(profile("user.updated", { first_name: "Intruso" }));
    for (const request of [
      { method: "POST", body: JSON.stringify(event) },
      signed(event, { key: Buffer.from("wrong-test-secret") }),
      signed(event, { timestamp: Math.floor(Date.now() / 1000) - 600 }),
      tampered,
    ]) expect((await t.fetch(path, request)).status).toBe(400);
    expect(await t.run(ctx => ctx.db.query("users").collect())).toEqual([]);
  });

  test("configurazione mancante fallisce chiusa; eventi estranei e payload incompleti non scrivono", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "");
    expect((await t.fetch(path, signed(profile()))).status).toBe(503);
    vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", signingSecret);
    expect((await t.fetch(path, signed({ type: "session.created", data: {} }))).status).toBe(204);
    for (const event of [profile("user.deleted", { id: "" }), profile("user.updated", { updated_at: null }), { ...profile(), timestamp: null }]) {
      expect((await t.fetch(path, signed(event))).status).toBe(400);
    }
    expect(await t.run(ctx => ctx.db.query("users").collect())).toEqual([]);
  });

  test("un aggiornamento prima della creazione e i retry fuori ordine conservano il profilo più recente", async () => {
    const t = convexTest(schema, modules);
    await t.fetch(path, signed(profile("user.updated", { first_name: "Nuovo" }, 2000)));
    await t.fetch(path, signed(profile("user.created", { first_name: "Vecchio" }, 1000)));
    // The resource timestamp wins, with the event timestamp as a tie breaker.
    await t.fetch(path, signed(profile("user.updated", { first_name: "Pari", updated_at: 2000 }, 3000)));
    await t.fetch(path, signed(profile("user.updated", { first_name: "Obsoleto", updated_at: 1999 }, 4000)));
    await t.fetch(path, signed(profile("user.updated", { first_name: "Retry", updated_at: 2000 }, 2500)));
    const users = await t.run(ctx => ctx.db.query("users").collect());
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe("Pari Rossi");
  });

  test("cancellazione prima della creazione impedisce la rinascita con webhook e JWT ritardati", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const deletion = { type: "user.deleted", timestamp: 2000, data: { id: "user_test", deleted: true } };
    expect((await t.fetch(path, signed(deletion))).status).toBe(204);
    await t.fetch(path, signed(deletion));
    await t.fetch(path, signed(profile("user.created")));
    await t.fetch(path, signed(profile("user.updated", {}, 3000)));
    await expect(t.withIdentity({ subject: "user_test" }).mutation(api.profiles.ensure, {})).rejects.toThrow("Account non disponibile");
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(await t.run(ctx => ctx.db.query("users").collect())).toMatchObject([{ clerkId: "user_test", name: "Un amico", status: "deleted", deletedAt: 2000 }]);
  });
});

describe("Cancellazione coordinata", () => {
  test("blocca subito gli accessi e rimuove a lotti contenuti, prenotazioni e avvisi senza toccare le altre liste", async () => {
    vi.useFakeTimers();
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "owner", name: "Proprietario" });
    const friend = t.withIdentity({ subject: "friend", name: "Amica" });
    const ownerId = await owner.mutation(api.profiles.ensure, {});
    const friendId = await friend.mutation(api.profiles.ensure, {});
    const listId = await owner.mutation(api.lists.create, { title: "Da cancellare", description: "", cover: "sand" });
    const otherListId = await friend.mutation(api.lists.create, { title: "Da conservare", description: "", cover: "plum" });
    const fields = { title: "Regalo", description: "", currency: "EUR" as const, category: "other" as const, priority: "normal" as const, locations: [] };
    const giftId = await owner.mutation(api.gifts.create, { listId, ...fields });
    const otherGiftId = await friend.mutation(api.gifts.create, { listId: otherListId, ...fields });
    const token = "A".repeat(43);
    const secret = "B".repeat(43);
    await owner.mutation(internal.invites.install, { listId, token, rotate: false });
    await t.mutation(internal.guests.install, { token, secret });
    await t.run(async ctx => {
      await ctx.db.insert("memberships", { listId, userId: friendId, status: "active", joinedAt: 0 });
      await ctx.db.insert("memberships", { listId: otherListId, userId: ownerId, status: "active", joinedAt: 0 });
      const guest = (await ctx.db.query("guestSessions").collect())[0];
      const booked = await ctx.db.insert("reservations", { listId, giftId, guestSessionId: guest._id, guestName: "Nome ospite", status: "active", snapshot: fields, giftVersion: 1, updatedAt: 0 });
      // More than one batch of gifts and notices, including other participants' data.
      for (let i = 0; i < 105; i++) {
        await ctx.db.insert("gifts", { listId, ...fields, removed: true, version: 1, updatedAt: 0 });
        await ctx.db.insert("notices", { guestSessionId: guest._id, reservationId: booked, kind: "changed", version: i });
      }
      const otherBooking = await ctx.db.insert("reservations", { listId: otherListId, giftId: otherGiftId, userId: ownerId, status: "active", snapshot: fields, giftVersion: 1, updatedAt: 0 });
      await ctx.db.insert("notices", { userId: ownerId, reservationId: otherBooking, kind: "changed", version: 1 });
    });
    const deletion = { type: "user.deleted", timestamp: 2000, data: { id: "owner", deleted: true } };
    expect((await t.fetch(path, signed(deletion))).status).toBe(204);
    await expect(owner.query(api.lists.getOwned, {})).rejects.toThrow();
    await expect(friend.query(api.lists.getParticipantDetail, { listId })).rejects.toThrow();
    expect(await friend.query(api.lists.getAccess, { listId })).toBe("unavailable");
    expect(await t.query(api.invites.preview, { token })).toBeNull();
    await expect(t.query(api.guests.getDetail, { token, secret })).rejects.toThrow();
    const deleted = await t.run(ctx => ctx.db.get(ownerId));
    expect(deleted).toMatchObject({ status: "deleted", name: "Un amico" });
    expect(deleted?.avatarUrl).toBeUndefined();

    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(await t.run(ctx => ctx.db.get(listId))).toBeNull();
    expect(await t.run(ctx => ctx.db.query("gifts").collect())).toMatchObject([{ _id: otherGiftId }]);
    for (const table of ["memberships", "invites", "guestSessions", "reservations", "notices"] as const) {
      expect(await t.run(ctx => ctx.db.query(table).collect())).toEqual([]);
    }
    expect(await t.run(ctx => ctx.db.get(otherListId))).toMatchObject({ title: "Da conservare", status: "active", giftCount: 1 });
    expect((await friend.query(api.lists.getOwnerDetail, { listId: otherListId })).gifts).toHaveLength(1);
    // Retry after cleanup keeps the tombstone and cannot touch unrelated content.
    await t.fetch(path, signed(deletion));
    await t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(await t.run(ctx => ctx.db.get(ownerId))).toEqual(deleted);
  });
});
