import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { betaGiftLimitMessage, betaLimits, betaListLimitMessage } from "../../lib/beta-limits";

// These indexed reads run in the transaction that inserts the new item, so
// simultaneous creations cannot both claim the final available slot.
export async function requireListCapacity(ctx: MutationCtx, ownerId: Id<"users">) {
  const lists = await ctx.db.query("lists").withIndex("by_owner", q => q.eq("ownerId", ownerId)).take(betaLimits.listsPerPerson);
  if (lists.length >= betaLimits.listsPerPerson) throw new ConvexError(betaListLimitMessage);
}

export async function requireGiftCapacity(ctx: MutationCtx, listId: Id<"lists">) {
  const gifts = await ctx.db.query("gifts").withIndex("by_list", q => q.eq("listId", listId).eq("removed", false)).take(betaLimits.giftsPerList);
  if (gifts.length >= betaLimits.giftsPerList) throw new ConvexError(betaGiftLimitMessage);
  return gifts.length;
}
