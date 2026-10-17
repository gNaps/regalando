import { describe, expect, test } from "vitest";
import { convexTest } from "convex-test";
import { readFileSync } from "node:fs";
import schema from "./schema";
import { api } from "./_generated/api";
import { IMAGE_USER_QUOTA } from "../lib/image-limits";

const modules = import.meta.glob("./**/*.ts");
const values = {title:"Un regalo",description:"Dettagli",currency:"EUR" as const,category:"design" as const,priority:"normal" as const,locations:[]};
const photo = () => new Uint8Array(readFileSync(new URL('../tests/fixtures/photo.jpg',import.meta.url))).buffer;
async function fixture() {
  const t=convexTest(schema,modules);
  const owner=t.withIdentity({subject:"owner"});const friend=t.withIdentity({subject:"friend"});
  await owner.mutation(api.profiles.ensure,{});await friend.mutation(api.profiles.ensure,{});
  const listId=await owner.mutation(api.lists.create,{title:"Lista",description:"",cover:"sand"});
  return {t,owner,friend,listId};
}
describe("Regali con foto dal form",()=>{
  test("crea, modifica e rimuove foto con i dati e aggiorna correttamente il conteggio",async()=>{
    const {t,owner,listId}=await fixture();
    const giftId=await owner.action(api.giftEditor.save,{listId,...values,photo:photo()});
    let detail=await owner.query(api.lists.getOwnerDetail,{listId});
    const original=detail.gifts[0].imageId!;
    expect(detail.gifts[0].imageUrl).toBeTruthy();expect((await owner.query(api.lists.getOwned,{}))[0].giftCount).toBe(1);
    await owner.action(api.giftEditor.save,{listId,giftId,expectedVersion:1,...values,title:"Altro nome"});
    detail=await owner.query(api.lists.getOwnerDetail,{listId});expect(detail.gifts[0].imageId).toBe(original);expect(detail.gifts[0].version).toBe(2);
    await owner.action(api.giftEditor.save,{listId,giftId,expectedVersion:2,...values,photo:photo()});
    expect(await t.run(ctx=>ctx.storage.get(original))).toBeNull();
    await owner.action(api.giftEditor.save,{listId,giftId,expectedVersion:3,...values,photo:null});
    expect(await t.run(ctx=>ctx.db.system.query("_storage").collect())).toHaveLength(0);
    expect((await owner.query(api.lists.getOwned,{}))[0].giftCount).toBe(1);
  });
  test("quota esaurita non crea regali parziali e non modifica versioni, prenotazioni o avvisi",async()=>{
    const {t,owner,friend,listId}=await fixture();
    const giftId=await owner.action(api.giftEditor.save,{listId,...values});
    const {token}=await owner.action(api.inviteLinks.create,{listId});await friend.mutation(api.invites.join,{token});
    await friend.mutation(api.reservations.reserveGift,{giftId,expectedVersion:1});
    await t.run(async ctx=>{const user=await ctx.db.query("users").withIndex("by_clerkId",q=>q.eq("clerkId","owner")).unique();await ctx.db.insert("imageUsage",{key:String(user!._id),bytes:IMAGE_USER_QUOTA});});
    await expect(owner.action(api.giftEditor.save,{listId,...values,photo:photo()})).rejects.toThrow("10 MB");
    await expect(owner.action(api.giftEditor.save,{listId,giftId,expectedVersion:1,...values,title:"Non salvato",photo:photo()})).rejects.toThrow("10 MB");
    const detail=await owner.query(api.lists.getOwnerDetail,{listId});expect(detail.gifts).toHaveLength(1);expect(detail.gifts[0]).toMatchObject({title:values.title,version:1});
    expect(await t.run(ctx=>ctx.db.query("notices").collect())).toHaveLength(0);
    expect((await t.run(ctx=>ctx.db.query("reservations").first()))?.giftVersion).toBe(1);
    expect(await t.run(ctx=>ctx.db.system.query("_storage").collect())).toHaveLength(0);
  });
  test("rifiuta accessi estranei, versioni obsolete, regali di altre liste e liste archiviate",async()=>{
    const {t,owner,friend,listId}=await fixture();
    const giftId=await owner.action(api.giftEditor.save,{listId,...values});
    await expect(friend.action(api.giftEditor.save,{listId,...values,photo:photo()})).rejects.toThrow();
    await expect(owner.action(api.giftEditor.save,{listId,giftId,expectedVersion:9,...values,photo:photo()})).rejects.toThrow("cambiato");
    const other=await owner.mutation(api.lists.create,{title:"Altra lista",description:"",cover:"plum"});
    await expect(owner.action(api.giftEditor.save,{listId:other,giftId,expectedVersion:1,...values,photo:photo()})).rejects.toThrow("non disponibile");
    await owner.mutation(api.lists.setArchived,{listId,archived:true});
    await expect(owner.action(api.giftEditor.save,{listId,...values,photo:photo()})).rejects.toThrow("Riattiva");
    expect(await t.run(ctx=>ctx.db.system.query("_storage").collect())).toHaveLength(0);
  });
});
