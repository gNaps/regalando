"use node";
import { randomBytes } from "node:crypto";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const create = action({ args: { token: v.string() }, handler: async (ctx, { token }): Promise<{ secret: string }> => {
  return ctx.runMutation(internal.guests.install, { token, secret: randomBytes(32).toString("base64url") });
} });
