import { httpRouter } from "convex/server";
import { verifyWebhook, type WebhookEvent } from "@clerk/backend/webhooks";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    if (!signingSecret) return new Response("Webhook not configured", { status: 503 });
    let event: WebhookEvent;
    try {
      event = await verifyWebhook(request, { signingSecret });
    } catch {
      return new Response("Invalid webhook", { status: 400 });
    }
    if (event.type !== "user.created" && event.type !== "user.updated" && event.type !== "user.deleted") return new Response(null, { status: 204 });
    if (typeof event.data?.id !== "string" || !event.data.id.trim() || !Number.isSafeInteger(event.timestamp) || event.timestamp < 0) return new Response("Invalid event", { status: 400 });
    // Do not catch persistence failures: a failed delivery must be retried by Clerk.
    if (event.type === "user.deleted") {
      await ctx.runMutation(internal.clerk.deleteUser, { clerkId: event.data.id, eventAt: event.timestamp });
    } else {
      const data = event.data;
      if (!Number.isSafeInteger(data.updated_at) || data.updated_at < 0) return new Response("Invalid event", { status: 400 });
      const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || data.username || "Un amico";
      await ctx.runMutation(internal.clerk.upsertUser, { clerkId: data.id, name, avatarUrl: data.image_url || undefined, updatedAt: data.updated_at, eventAt: event.timestamp });
    }
    return new Response(null, { status: 204 });
  }),
});

export default http;
