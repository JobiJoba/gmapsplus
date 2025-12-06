import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Create a new list
 */
export const createList = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const listId = await ctx.db.insert("lists", {
      userId,
      name: args.name,
      description: args.description,
      isPublic: args.isPublic,
      shareToken: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return listId;
  },
});

/**
 * Get all lists for the current user
 */
export const getUserLists = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const lists = await ctx.db
      .query("lists")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Get place counts for each list
    const listsWithCounts = await Promise.all(
      lists.map(async (list) => {
        const listPlaces = await ctx.db
          .query("listPlaces")
          .withIndex("by_listId", (q) => q.eq("listId", list._id))
          .collect();

        return {
          ...list,
          placeCount: listPlaces.length,
        };
      })
    );

    return listsWithCounts;
  },
});

/**
 * Get list by ID with places
 */
export const getListById = query({
  args: {
    listId: v.id("lists"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.listId);
    if (!list) {
      return null;
    }

    // Check if user has access (owner, public list, or shared)
    if (list.userId !== userId) {
      // Allow access if list is public
      if (!list.isPublic) {
        // Check if user has been shared with
        const shared = await ctx.db
          .query("sharedLists")
          .withIndex("by_listId", (q) => q.eq("listId", args.listId))
          .filter((q) => q.eq(q.field("userId"), userId))
          .first();

        if (!shared) {
          throw new Error("List not found or access denied");
        }
      }
    }

    // Get places in the list
    const listPlaces = await ctx.db
      .query("listPlaces")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .collect();

    const places = await Promise.all(
      listPlaces.map(async (listPlace) => {
        const place = await ctx.db.get(listPlace.placeId);
        return place ? { ...place, addedAt: listPlace.addedAt } : null;
      })
    );

    return {
      ...list,
      places: places.filter((p) => p !== null),
    };
  },
});

/**
 * Update list details
 */
export const updateList = mutation({
  args: {
    listId: v.id("lists"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) {
      throw new Error("List not found or not owned by user");
    }

    await ctx.db.patch(args.listId, {
      name: args.name ?? list.name,
      description: args.description ?? list.description,
      isPublic: args.isPublic ?? list.isPublic,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a list
 */
export const deleteList = mutation({
  args: {
    listId: v.id("lists"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) {
      throw new Error("List not found or not owned by user");
    }

    // Delete all listPlaces entries
    const listPlaces = await ctx.db
      .query("listPlaces")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .collect();

    for (const listPlace of listPlaces) {
      await ctx.db.delete(listPlace._id);
    }

    // Delete sharedLists entries
    const sharedLists = await ctx.db
      .query("sharedLists")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .collect();

    for (const sharedList of sharedLists) {
      await ctx.db.delete(sharedList._id);
    }

    // Delete the list
    await ctx.db.delete(args.listId);
  },
});

/**
 * Add a place to a list
 */
export const addPlaceToList = mutation({
  args: {
    listId: v.id("lists"),
    placeId: v.id("places"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) {
      throw new Error("List not found or not owned by user");
    }

    // Check if place is already in list
    const existing = await ctx.db
      .query("listPlaces")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .filter((q) => q.eq(q.field("placeId"), args.placeId))
      .first();

    if (existing) {
      return; // Already in list
    }

    await ctx.db.insert("listPlaces", {
      listId: args.listId,
      placeId: args.placeId,
      addedAt: Date.now(),
    });

    // Update list updatedAt
    await ctx.db.patch(args.listId, {
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remove a place from a list
 */
export const removePlaceFromList = mutation({
  args: {
    listId: v.id("lists"),
    placeId: v.id("places"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) {
      throw new Error("List not found or not owned by user");
    }

    const listPlace = await ctx.db
      .query("listPlaces")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .filter((q) => q.eq(q.field("placeId"), args.placeId))
      .first();

    if (listPlace) {
      await ctx.db.delete(listPlace._id);
    }

    // Update list updatedAt
    await ctx.db.patch(args.listId, {
      updatedAt: Date.now(),
    });
  },
});

/**
 * Generate a share token for a list
 */
export const generateShareToken = mutation({
  args: {
    listId: v.id("lists"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== userId) {
      throw new Error("List not found or not owned by user");
    }

    // Generate a unique token
    const token = crypto.randomUUID();

    await ctx.db.patch(args.listId, {
      shareToken: token,
      updatedAt: Date.now(),
    });

    return token;
  },
});

/**
 * Get all public lists from everyone
 */
export const getSharedLists = query({
  args: {},
  handler: async (ctx) => {
    // Get all public lists
    const allLists = await ctx.db
      .query("lists")
      .filter((q) => q.eq(q.field("isPublic"), true))
      .collect();

    // Get place counts and user info for each list
    const listsWithCounts = await Promise.all(
      allLists.map(async (list) => {
        const listPlaces = await ctx.db
          .query("listPlaces")
          .withIndex("by_listId", (q) => q.eq("listId", list._id))
          .collect();

        // Get user info
        const user = await ctx.db.get(list.userId);
        const ownerName = (user as any)?.name || (user as any)?.email || "Unknown";

        return {
          ...list,
          placeCount: listPlaces.length,
          ownerName,
        };
      })
    );

    return listsWithCounts;
  },
});

/**
 * Get limited public lists (for landing page)
 */
export const getLimitedSharedLists = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    
    // Get all public lists
    const allLists = await ctx.db
      .query("lists")
      .filter((q) => q.eq(q.field("isPublic"), true))
      .collect();

    // Sort by updatedAt descending and take limit
    const sortedLists = allLists
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);

    // Get place counts and user info for each list
    const listsWithCounts = await Promise.all(
      sortedLists.map(async (list) => {
        const listPlaces = await ctx.db
          .query("listPlaces")
          .withIndex("by_listId", (q) => q.eq("listId", list._id))
          .collect();

        // Get user info
        const user = await ctx.db.get(list.userId);
        const ownerName = (user as any)?.name || (user as any)?.email || "Unknown";

        return {
          ...list,
          placeCount: listPlaces.length,
          ownerName,
        };
      })
    );

    return listsWithCounts;
  },
});

/**
 * Get public list by ID (no authentication required)
 */
export const getPublicListById = query({
  args: {
    listId: v.id("lists"),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) {
      return null;
    }

    // Only allow access to public lists
    if (!list.isPublic) {
      return null;
    }

    // Get places in the list
    const listPlaces = await ctx.db
      .query("listPlaces")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .collect();

    const places = await Promise.all(
      listPlaces.map(async (listPlace) => {
        const place = await ctx.db.get(listPlace.placeId);
        return place ? { ...place, addedAt: listPlace.addedAt } : null;
      })
    );

    // Get user info
    const user = await ctx.db.get(list.userId);
    const ownerName = (user as any)?.name || (user as any)?.email || "Unknown";

    return {
      ...list,
      places: places.filter((p) => p !== null),
      ownerName,
    };
  },
});

/**
 * Get list by share token (for public access)
 */
export const getListByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db
      .query("lists")
      .withIndex("by_shareToken", (q) => q.eq("shareToken", args.token))
      .first();

    if (!list) {
      return null;
    }

    // Get places in the list
    const listPlaces = await ctx.db
      .query("listPlaces")
      .withIndex("by_listId", (q) => q.eq("listId", list._id))
      .collect();

    const places = await Promise.all(
      listPlaces.map(async (listPlace) => {
        const place = await ctx.db.get(listPlace.placeId);
        return place ? { ...place, addedAt: listPlace.addedAt } : null;
      })
    );

    return {
      ...list,
      places: places.filter((p) => p !== null),
    };
  },
});

/**
 * Add a shared list to user's shared lists
 */
export const addSharedList = mutation({
  args: {
    listId: v.id("lists"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const list = await ctx.db.get(args.listId);
    if (!list) {
      throw new Error("List not found");
    }

    // Check if already shared
    const existing = await ctx.db
      .query("sharedLists")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (existing) {
      return; // Already shared
    }

    await ctx.db.insert("sharedLists", {
      listId: args.listId,
      userId,
      sharedAt: Date.now(),
    });
  },
});


