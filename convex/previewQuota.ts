import { ConvexError } from "convex/values";
import { internalMutation } from "./_generated/server";
import { requireUser } from "./lib/access";

export const previewWindowMs = 10 * 60 * 1000;
export const previewLimit = 30;

// Authenticates the caller and counts one preview request against a sliding window.
// Called from the Node action, which cannot read the database on its own.
export const reserve = internalMutation({
  args: {},
  handler: async ctx => {
    const user = await requireUser(ctx);
    const now = Date.now();
    const quota = await ctx.db.query("previewQuota").withIndex("by_user", q => q.eq("userId", user._id)).unique();
    if (!quota || now - quota.windowStart >= previewWindowMs) {
      if (quota) await ctx.db.patch(quota._id, { windowStart: now, count: 1 });
      else await ctx.db.insert("previewQuota", { userId: user._id, windowStart: now, count: 1 });
      return null;
    }
    if (quota.count >= previewLimit) throw new ConvexError("Hai richiesto molte anteprime in poco tempo. Riprova tra qualche minuto.");
    await ctx.db.patch(quota._id, { count: quota.count + 1 });
    return null;
  },
});
