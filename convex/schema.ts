import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const category = v.union(v.literal("design"), v.literal("tech"), v.literal("gaming"), v.literal("music"), v.literal("art"), v.literal("travel"), v.literal("style"), v.literal("beauty"), v.literal("experiences"), v.literal("other"), v.literal("books"));
export const location = v.union(
  v.object({ kind: v.literal("online"), url: v.string() }),
  v.object({ kind: v.literal("physical"), name: v.string(), address: v.optional(v.string()) }),
);
export const giftFields = {
  title: v.string(), description: v.string(), priceCents: v.optional(v.number()), currency: v.literal("EUR"),
  category, priority: v.union(v.literal("normal"), v.literal("favorite")), locations: v.array(location),
};

export default defineSchema({
  users: defineTable({ clerkId: v.string(), name: v.string(), avatarUrl: v.optional(v.string()), status: v.union(v.literal("active"), v.literal("deleted")), clerkUpdatedAt: v.optional(v.number()), clerkEventAt: v.optional(v.number()), deletedAt: v.optional(v.number()) }).index("by_clerkId", ["clerkId"]),
  lists: defineTable({ ownerId: v.id("users"), title: v.string(), description: v.string(), occasion: v.optional(v.string()), date: v.optional(v.string()), status: v.union(v.literal("active"), v.literal("archived")), cover: v.union(v.literal("plum"), v.literal("sage"), v.literal("sand")), giftCount: v.optional(v.number()), updatedAt: v.number() }).index("by_owner", ["ownerId", "status"]),
  gifts: defineTable({ listId: v.id("lists"), ...giftFields, imageId: v.optional(v.id("_storage")), removed: v.boolean(), version: v.number(), updatedAt: v.number() }).index("by_list", ["listId", "removed"]),
  memberships: defineTable({ listId: v.id("lists"), userId: v.id("users"), status: v.union(v.literal("active"), v.literal("revoked")), joinedAt: v.number() }).index("by_list_user", ["listId", "userId"]).index("by_user", ["userId", "status"]),
  invites: defineTable({ listId: v.id("lists"), token: v.string(), digest: v.string(), status: v.union(v.literal("active"), v.literal("revoked")) }).index("by_digest", ["digest"]).index("by_list", ["listId", "status"]),
  guestSessions: defineTable({ listId: v.id("lists"), secretDigest: v.string(), status: v.union(v.literal("active"), v.literal("revoked")) }).index("by_digest", ["secretDigest"]).index("by_list", ["listId"]),
  reservations: defineTable({ listId: v.id("lists"), giftId: v.id("gifts"), userId: v.optional(v.id("users")), guestSessionId: v.optional(v.id("guestSessions")), guestName: v.optional(v.string()), status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("removed")), snapshot: v.object(giftFields), giftVersion: v.number(), updatedAt: v.number() }).index("by_gift", ["giftId", "status"]).index("by_user", ["userId", "status"]).index("by_guest", ["guestSessionId", "status"]).index("by_list", ["listId", "status"]),
  notices: defineTable({ userId: v.optional(v.id("users")), guestSessionId: v.optional(v.id("guestSessions")), reservationId: v.id("reservations"), kind: v.union(v.literal("changed"), v.literal("removed")), version: v.number(), previousSnapshot: v.optional(v.object(giftFields)), readAt: v.optional(v.number()) }).index("by_user", ["userId"]).index("by_guest", ["guestSessionId"]).index("by_reservation", ["reservationId"]),
});
