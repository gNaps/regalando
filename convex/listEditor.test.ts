import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { readFileSync } from "node:fs";
import schema from "./schema";
import { api } from "./_generated/api";
import { IMAGE_USER_QUOTA } from "../lib/image-limits";

const modules = import.meta.glob("./**/*.ts");
const values = { title: "Compleanno", description: "Le mie idee", date: "2026-12-01", cover: "sand" as const };
const photo = () => new Uint8Array(readFileSync(new URL('../tests/fixtures/photo.jpg', import.meta.url))).buffer;
async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner" });
  const friend = t.withIdentity({ subject: "friend" });
  await owner.mutation(api.profiles.ensure, {}); await friend.mutation(api.profiles.ensure, {});
  return { t, owner, friend };
}

describe("Creazione e modifica lista con foto", () => {
  test("crea e aggiorna testata e foto, conserva o rimuove la foto esplicitamente", async () => {
    const { t, owner } = await fixture();
    const listId = await owner.action(api.listEditor.save, { ...values, photo: photo() });
    let data = await owner.query(api.lists.getOwnerDetail, {listId});
    const firstImage = data.list.imageId!;
    expect(data.list).toMatchObject(values); expect(data.list.imageUrl).toBeTruthy();
    await owner.action(api.listEditor.save, { ...values, listId, title:"Natale", date:undefined, description:"", cover:"sage" });
    data = await owner.query(api.lists.getOwnerDetail, {listId});
    expect(data.list).toMatchObject({title:"Natale", description:"", cover:"sage", imageId:firstImage});
    expect(data.list.date).toBeUndefined();
    await owner.action(api.listEditor.save, {...values,listId,photo:photo()});
    expect(await t.run(ctx=>ctx.storage.get(firstImage))).toBeNull();
    expect(await t.run(ctx=>ctx.db.system.query("_storage").collect())).toHaveLength(1);
    await owner.action(api.listEditor.save, {...values,listId,photo:null});
    expect((await owner.query(api.lists.getOwnerDetail,{listId})).list.imageId).toBeUndefined();
    expect(await t.run(ctx=>ctx.db.system.query("_storage").collect())).toHaveLength(0);
  });
  test("quota esaurita non crea liste parziali né modifica la testata", async () => {
    const { t, owner } = await fixture();
    const listId=await owner.action(api.listEditor.save, values);
    await t.run(async ctx=>{const user=await ctx.db.query("users").withIndex("by_clerkId",q=>q.eq("clerkId","owner")).unique();await ctx.db.insert("imageUsage",{key:String(user!._id),bytes:IMAGE_USER_QUOTA});});
    await expect(owner.action(api.listEditor.save, {...values,photo:photo()})).rejects.toThrow("10 MB");
    await expect(owner.action(api.listEditor.save, {...values,listId,title:"Da non salvare",photo:photo()})).rejects.toThrow("10 MB");
    expect(await owner.query(api.lists.getOwned,{})).toHaveLength(1);
    expect((await owner.query(api.lists.getOwnerDetail,{listId})).list.title).toBe(values.title);
    expect(await t.run(ctx=>ctx.db.system.query("_storage").collect())).toHaveLength(0);
  });
  test("convalida dati e proprietà; la testata delle liste archiviate non si modifica", async () => {
    const { t, owner, friend } = await fixture();
    const listId=await owner.action(api.listEditor.save, values);
    await expect(owner.action(api.listEditor.save,{...values,listId,title:" "})).rejects.toThrow();
    await expect(owner.action(api.listEditor.save,{...values,listId,date:"2026-02-30"})).rejects.toThrow();
    await expect(friend.action(api.listEditor.save,{...values,listId,photo:photo()})).rejects.toThrow();
    await expect(t.action(api.listEditor.save,values)).rejects.toThrow();
    await owner.mutation(api.lists.setArchived,{listId,archived:true});
    await expect(owner.action(api.listEditor.save,{...values,listId})).rejects.toThrow("Riattiva");
    expect(await t.run(ctx=>ctx.db.system.query("_storage").collect())).toHaveLength(0);
  });
});
