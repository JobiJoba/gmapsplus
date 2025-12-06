import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  numbers: defineTable({
    value: v.number(),
  }),
  // Places table - shared entities, no user ownership
  places: defineTable({
    googlePlaceId: v.string(),
    // Store all Google Places API fields as a flexible object
    // Using fieldMask: "*" to get all available fields
    data: v.any(), // Flexible object to store all API response fields
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_googlePlaceId", ["googlePlaceId"]),
  
  // Junction table linking users to places they've saved
  userPlaces: defineTable({
    userId: v.id("users"),
    placeId: v.id("places"),
    savedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_placeId", ["placeId"])
    .index("by_userId_placeId", ["userId", "placeId"]),
  
  // Lists table - user-created lists
  lists: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
    shareToken: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_shareToken", ["shareToken"]),
  
  // Junction table linking places to lists
  listPlaces: defineTable({
    listId: v.id("lists"),
    placeId: v.id("places"),
    addedAt: v.number(),
  })
    .index("by_listId", ["listId"])
    .index("by_placeId", ["placeId"]),
  
  // Track who has access to shared lists
  sharedLists: defineTable({
    listId: v.id("lists"),
    userId: v.id("users"),
    sharedAt: v.number(),
  })
    .index("by_listId", ["listId"])
    .index("by_userId", ["userId"]),
});
