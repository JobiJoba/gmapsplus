import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

/**
 * Save a place to the database. First checks if place exists by googlePlaceId.
 * If it exists, just creates the userPlaces link. If not, requires placeData to be provided.
 */
export const savePlace = mutation({
  args: {
    googlePlaceId: v.string(),
    placeData: v.optional(v.any()), // Optional place data from Google Places API
  },
  handler: async (ctx, args): Promise<{ placeId: Id<"places">; alreadySaved: boolean }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if place already exists in our database
    const existingPlace = await ctx.db
      .query("places")
      .withIndex("by_googlePlaceId", (q) => q.eq("googlePlaceId", args.googlePlaceId))
      .first();

    let placeId: Id<"places">;
    if (existingPlace) {
      // Place exists, just use it
      placeId = existingPlace._id;
    } else {
      // Place doesn't exist, need placeData to save it
      if (!args.placeData) {
        throw new Error(
          "Place not found in database. Please fetch place data first using fetchPlaceDetails action."
        );
      }

      // Save the place to database
      placeId = await ctx.db.insert("places", {
        googlePlaceId: args.googlePlaceId,
        data: args.placeData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Check if user already has this place saved
    const existingUserPlace = await ctx.db
      .query("userPlaces")
      .withIndex("by_userId_placeId", (q) =>
        q.eq("userId", userId).eq("placeId", placeId)
      )
      .first();

    if (existingUserPlace) {
      // User already has this place saved
      return { placeId, alreadySaved: true };
    }

    // Create userPlaces link
    await ctx.db.insert("userPlaces", {
      userId,
      placeId,
      savedAt: Date.now(),
    });

    return { placeId, alreadySaved: false };
  },
});

/**
 * Get all places saved by the current user
 */
export const getUserPlaces = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const userPlaces = await ctx.db
      .query("userPlaces")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Fetch place details for each userPlace
    const places = await Promise.all(
      userPlaces.map(async (userPlace) => {
        const place = await ctx.db.get(userPlace.placeId);
        if (!place) {
          return null;
        }
        return {
          ...place,
          savedAt: userPlace.savedAt,
          userPlaceId: userPlace._id,
        };
      })
    );

    return places.filter((p) => p !== null);
  },
});

/**
 * Get place by ID
 */
export const getPlaceById = query({
  args: {
    placeId: v.id("places"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.placeId);
  },
});

/**
 * Remove a saved place from user's collection
 */
export const removePlace = mutation({
  args: {
    userPlaceId: v.id("userPlaces"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const userPlace = await ctx.db.get(args.userPlaceId);
    if (!userPlace || userPlace.userId !== userId) {
      throw new Error("User place not found or not owned by user");
    }

    await ctx.db.delete(args.userPlaceId);
  },
});

/**
 * Search/filter user's places
 */
export const searchPlaces = query({
  args: {
    searchQuery: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const userPlaces = await ctx.db
      .query("userPlaces")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const places = await Promise.all(
      userPlaces.map(async (userPlace) => {
        const place = await ctx.db.get(userPlace.placeId);
        if (!place) {
          return null;
        }
        return {
          ...place,
          savedAt: userPlace.savedAt,
          userPlaceId: userPlace._id,
        };
      })
    );

    let filtered = places.filter((p) => p !== null);

    // Filter by search query
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      filtered = filtered.filter((place) => {
        const name = place?.data?.displayName?.text?.toLowerCase() || "";
        const address = place?.data?.formattedAddress?.toLowerCase() || "";
        return name.includes(query) || address.includes(query);
      });
    }

    // Filter by type
    if (args.type) {
      filtered = filtered.filter((place) => {
        const types = place?.data?.types || [];
        return types.includes(args.type);
      });
    }

    return filtered;
  },
});

