import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { requireUser } from "./lib/access";

export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Accedi per continuare.");
    const existing = await ctx.db.query("users").withIndex("by_clerkId", q => q.eq("clerkId", identity.subject)).unique();
    const name = identity.name?.trim() || identity.givenName?.trim() || undefined;
    if (existing) {
      if (existing.status !== "active") throw new ConvexError("Account non disponibile.");
      // Once synchronized, webhook data takes precedence over possibly stale JWT claims.
      if (existing.clerkUpdatedAt !== undefined) return existing._id;
      const nextName = name ?? existing.name;
      // Scrive solo se qualcosa è cambiato: evita invalidazioni a ogni apertura del workspace.
      if (nextName !== existing.name || identity.pictureUrl !== existing.avatarUrl) {
        await ctx.db.patch(existing._id, { name: nextName, avatarUrl: identity.pictureUrl });
      }
      return existing._id;
    }
    return ctx.db.insert("users", { clerkId: identity.subject, name: name ?? "Un amico", avatarUrl: identity.pictureUrl, status: "active" });
  },
});

export const me = query({ args: {}, handler: async ctx => {
  const user = await requireUser(ctx);
  return { id: user._id, name: user.name, avatarUrl: user.avatarUrl };
} });
