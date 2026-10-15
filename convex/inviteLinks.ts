"use node";

import { randomBytes } from "node:crypto";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const create = action({ args: { listId: v.id("lists") }, handler: async (ctx, { listId }): Promise<{ token: string }> => {
  return ctx.runMutation(internal.invites.install, { listId, token: randomBytes(32).toString("base64url"), rotate: false });
} });

export const rotate = action({ args: { listId: v.id("lists") }, handler: async (ctx, { listId }): Promise<{ token: string }> => {
  return ctx.runMutation(internal.invites.install, { listId, token: randomBytes(32).toString("base64url"), rotate: true });
} });
