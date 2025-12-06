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
 * Get facets (unique values) from all user's places data for faceted search
 */
export const getFacets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {};
    }

    const userPlaces = await ctx.db
      .query("userPlaces")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const places = await Promise.all(
      userPlaces.map(async (userPlace) => {
        const place = await ctx.db.get(userPlace.placeId);
        return place;
      })
    );

    const facets: Record<string, Set<string | number>> = {};

    // Extract facets from all places
    for (const place of places) {
      if (!place?.data) continue;

      const data = place.data;

      // Extract types (array)
      if (Array.isArray(data.types)) {
        if (!facets.types) facets.types = new Set();
        const typesSet = facets.types;
        data.types.forEach((type: string) => {
          typesSet.add(type);
        });
      }

      // Extract priceLevel
      if (typeof data.priceLevel === "number") {
        if (!facets.priceLevel) facets.priceLevel = new Set();
        facets.priceLevel.add(data.priceLevel);
      }

      // Extract rating ranges (buckets)
      if (typeof data.rating === "number") {
        if (!facets.rating) facets.rating = new Set();
        const ratingBucket = Math.floor(data.rating);
        facets.rating.add(ratingBucket);
      }

      // Extract business status
      if (data.businessStatus) {
        if (!facets.businessStatus) facets.businessStatus = new Set();
        facets.businessStatus.add(data.businessStatus);
      }

      // Extract accessibility options
      if (data.accessibilityOptions) {
        if (!facets.accessibilityOptions) facets.accessibilityOptions = new Set();
        const accessibilitySet = facets.accessibilityOptions;
        if (Array.isArray(data.accessibilityOptions)) {
          data.accessibilityOptions.forEach((opt: string) => {
            accessibilitySet.add(opt);
          });
        } else if (typeof data.accessibilityOptions === "object") {
          Object.keys(data.accessibilityOptions).forEach((key) => {
            if ((data.accessibilityOptions as Record<string, unknown>)[key]) {
              accessibilitySet.add(key);
            }
          });
        }
      }

      // Extract current opening hours (day of week)
      if (data.currentOpeningHours?.weekdayDescriptions) {
        if (!facets.openingDays) facets.openingDays = new Set();
        const openingDaysSet = facets.openingDays;
        data.currentOpeningHours.weekdayDescriptions.forEach((day: string) => {
          const dayMatch = day.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
          if (dayMatch) {
            openingDaysSet.add(dayMatch[1]);
          }
        });
      }

      // Extract secondary hours (if available)
      if (data.secondaryHours && Array.isArray(data.secondaryHours)) {
        if (!facets.secondaryHours) facets.secondaryHours = new Set();
        const secondaryHoursSet = facets.secondaryHours;
        data.secondaryHours.forEach((hours: unknown) => {
          if (typeof hours === "object" && hours !== null && "hoursType" in hours) {
            secondaryHoursSet.add(String((hours as { hoursType: unknown }).hoursType));
          }
        });
      }

      // Extract payment options
      if (data.paymentOptions && typeof data.paymentOptions === "object") {
        if (!facets.paymentOptions) facets.paymentOptions = new Set();
        const paymentOptionsSet = facets.paymentOptions;
        Object.keys(data.paymentOptions).forEach((key) => {
          if ((data.paymentOptions as Record<string, unknown>)[key]) {
            paymentOptionsSet.add(key);
          }
        });
      }

      // Extract fuel options (for gas stations)
      if (Array.isArray(data.fuelOptions)) {
        if (!facets.fuelOptions) facets.fuelOptions = new Set();
        const fuelOptionsSet = facets.fuelOptions;
        data.fuelOptions.forEach((fuel: string) => {
          fuelOptionsSet.add(fuel);
        });
      }

      // Extract EV charge options
      if (Array.isArray(data.evChargeOptions)) {
        if (!facets.evChargeOptions) facets.evChargeOptions = new Set();
        const evChargeOptionsSet = facets.evChargeOptions;
        data.evChargeOptions.forEach((opt: unknown) => {
          if (typeof opt === "object" && opt !== null && "connectorCount" in opt) {
            evChargeOptionsSet.add(String((opt as { connectorCount: unknown }).connectorCount));
          }
        });
      }

      // Extract parking options
      if (data.parkingOptions && typeof data.parkingOptions === "object") {
        if (!facets.parkingOptions) facets.parkingOptions = new Set();
        const parkingOptionsSet = facets.parkingOptions;
        Object.keys(data.parkingOptions).forEach((key) => {
          if ((data.parkingOptions as Record<string, unknown>)[key]) {
            parkingOptionsSet.add(key);
          }
        });
      }

      // Extract sub destinations (for airports, malls, etc.)
      if (Array.isArray(data.subDestinations)) {
        if (!facets.subDestinations) facets.subDestinations = new Set();
        const subDestinationsSet = facets.subDestinations;
        data.subDestinations.forEach((sub: unknown) => {
          if (typeof sub === "object" && sub !== null && "name" in sub) {
            subDestinationsSet.add(String((sub as { name: unknown }).name));
          }
        });
      }

      // Extract editorial summary (for categorization)
      if (data.editorialSummary?.text) {
        // Could extract keywords, but for now just track if it exists
        if (!facets.hasEditorialSummary) facets.hasEditorialSummary = new Set();
        facets.hasEditorialSummary.add("yes");
      }
    }

    // Convert Sets to arrays and sort
    const result: Record<string, (string | number)[]> = {};
    for (const [key, valueSet] of Object.entries(facets)) {
      result[key] = Array.from(valueSet).sort((a, b) => {
        if (typeof a === "number" && typeof b === "number") return a - b;
        return String(a).localeCompare(String(b));
      });
    }

    return result;
  },
});

/**
 * Search/filter user's places with faceted search
 */
export const searchPlaces = query({
  args: {
    searchQuery: v.optional(v.string()),
    facets: v.optional(v.any()), // Object with facet field -> array of selected values
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
        const editorialSummary = place?.data?.editorialSummary?.text?.toLowerCase() || "";
        return (
          name.includes(query) ||
          address.includes(query) ||
          editorialSummary.includes(query)
        );
      });
    }

    // Filter by facets
    if (args.facets && typeof args.facets === "object") {
      const facets = args.facets as Record<string, (string | number)[]>;
      
      filtered = filtered.filter((place) => {
        if (!place?.data) return false;
        const data = place.data;

        // Check each facet filter
        for (const [facetKey, selectedValues] of Object.entries(facets)) {
          if (!selectedValues || selectedValues.length === 0) continue;

          let matches = false;

          switch (facetKey) {
            case "types": {
              const types = (data.types as string[]) || [];
              matches = selectedValues.some((val) => types.includes(String(val)));
              break;
            }

            case "priceLevel":
              matches = selectedValues.includes(data.priceLevel);
              break;

            case "rating":
              if (data.rating) {
                const ratingBucket = Math.floor(data.rating);
                matches = selectedValues.includes(ratingBucket);
              }
              break;

            case "businessStatus":
              matches = selectedValues.includes(data.businessStatus);
              break;

            case "accessibilityOptions": {
              const options = data.accessibilityOptions;
              if (options) {
                if (Array.isArray(options)) {
                  matches = selectedValues.some((val) =>
                    options.includes(String(val))
                  );
                } else if (typeof options === "object") {
                  matches = selectedValues.some((val) => (options as Record<string, unknown>)[String(val)]);
                }
              }
              break;
            }

            case "openingDays":
              if (data.currentOpeningHours?.weekdayDescriptions) {
                matches = selectedValues.some((val) => {
                  const dayPattern = new RegExp(`^${val}`, "i");
                  return data.currentOpeningHours.weekdayDescriptions.some((day: string) =>
                    dayPattern.test(day)
                  );
                });
              }
              break;

            case "secondaryHours": {
              const hours = data.secondaryHours;
              if (Array.isArray(hours)) {
                matches = selectedValues.some((val) =>
                  hours.some((h: unknown) => 
                    typeof h === "object" && h !== null && "hoursType" in h && (h as { hoursType: unknown }).hoursType === val
                  )
                );
              }
              break;
            }

            case "paymentOptions": {
              const options = data.paymentOptions;
              if (options && typeof options === "object") {
                matches = selectedValues.some((val) => (options as Record<string, unknown>)[String(val)]);
              }
              break;
            }

            case "fuelOptions": {
              const options = data.fuelOptions;
              if (Array.isArray(options)) {
                matches = selectedValues.some((val) =>
                  options.includes(String(val))
                );
              }
              break;
            }

            case "evChargeOptions": {
              const options = data.evChargeOptions;
              if (Array.isArray(options)) {
                matches = selectedValues.some((val) =>
                  options.some((opt: unknown) =>
                    typeof opt === "object" && opt !== null && "connectorCount" in opt &&
                    String((opt as { connectorCount: unknown }).connectorCount) === String(val)
                  )
                );
              }
              break;
            }

            case "parkingOptions": {
              const options = data.parkingOptions;
              if (options && typeof options === "object") {
                matches = selectedValues.some((val) => (options as Record<string, unknown>)[String(val)]);
              }
              break;
            }

            case "subDestinations": {
              const destinations = data.subDestinations;
              if (Array.isArray(destinations)) {
                matches = selectedValues.some((val) =>
                  destinations.some((sub: unknown) =>
                    typeof sub === "object" && sub !== null && "name" in sub &&
                    String((sub as { name: unknown }).name) === String(val)
                  )
                );
              }
              break;
            }

            case "hasEditorialSummary":
              matches = selectedValues.includes("yes") && !!data.editorialSummary?.text;
              break;

            default: {
              // Generic check for any other field
              const fieldValue = (data as Record<string, unknown>)[facetKey];
              if (Array.isArray(fieldValue)) {
                matches = selectedValues.some((val) => fieldValue.includes(val));
              } else if (typeof fieldValue === "object" && fieldValue !== null) {
                matches = selectedValues.some((val) => (fieldValue as Record<string, unknown>)[String(val)]);
              } else {
                matches = selectedValues.includes(fieldValue as string | number);
              }
              break;
            }
          }

          if (!matches) return false;
        }

        return true;
      });
    }

    return filtered;
  },
});

/**
 * Get facets (unique values) from places in a specific list
 */
export const getListFacets = query({
  args: {
    listId: v.id("lists"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {};
    }

    // Get the list and check access
    const list = await ctx.db.get(args.listId);
    if (!list) {
      return {};
    }

    // Check if user has access (owner, public list, or shared)
    if (list.userId !== userId) {
      if (!list.isPublic) {
        const shared = await ctx.db
          .query("sharedLists")
          .withIndex("by_listId", (q) => q.eq("listId", args.listId))
          .filter((q) => q.eq(q.field("userId"), userId))
          .first();
        if (!shared) {
          return {};
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
        return await ctx.db.get(listPlace.placeId);
      })
    );

    const facets: Record<string, Set<string | number>> = {};

    // Extract facets from all places (same logic as getFacets)
    for (const place of places) {
      if (!place?.data) continue;

      const data = place.data;

      // Extract types (array)
      if (Array.isArray(data.types)) {
        if (!facets.types) facets.types = new Set();
        const typesSet = facets.types;
        data.types.forEach((type: string) => {
          typesSet.add(type);
        });
      }

      // Extract priceLevel
      if (typeof data.priceLevel === "number") {
        if (!facets.priceLevel) facets.priceLevel = new Set();
        facets.priceLevel.add(data.priceLevel);
      }

      // Extract rating ranges (buckets)
      if (typeof data.rating === "number") {
        if (!facets.rating) facets.rating = new Set();
        const ratingBucket = Math.floor(data.rating);
        facets.rating.add(ratingBucket);
      }

      // Extract business status
      if (data.businessStatus) {
        if (!facets.businessStatus) facets.businessStatus = new Set();
        facets.businessStatus.add(data.businessStatus);
      }

      // Extract accessibility options
      if (data.accessibilityOptions) {
        if (!facets.accessibilityOptions) facets.accessibilityOptions = new Set();
        const accessibilitySet = facets.accessibilityOptions;
        if (Array.isArray(data.accessibilityOptions)) {
          data.accessibilityOptions.forEach((opt: string) => {
            accessibilitySet.add(opt);
          });
        } else if (typeof data.accessibilityOptions === "object") {
          Object.keys(data.accessibilityOptions).forEach((key) => {
            if ((data.accessibilityOptions as Record<string, unknown>)[key]) {
              accessibilitySet.add(key);
            }
          });
        }
      }

      // Extract current opening hours (day of week)
      if (data.currentOpeningHours?.weekdayDescriptions) {
        if (!facets.openingDays) facets.openingDays = new Set();
        const openingDaysSet = facets.openingDays;
        data.currentOpeningHours.weekdayDescriptions.forEach((day: string) => {
          const dayMatch = day.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
          if (dayMatch) {
            openingDaysSet.add(dayMatch[1]);
          }
        });
      }

      // Extract secondary hours (if available)
      if (data.secondaryHours && Array.isArray(data.secondaryHours)) {
        if (!facets.secondaryHours) facets.secondaryHours = new Set();
        const secondaryHoursSet = facets.secondaryHours;
        data.secondaryHours.forEach((hours: unknown) => {
          if (typeof hours === "object" && hours !== null && "hoursType" in hours) {
            secondaryHoursSet.add(String((hours as { hoursType: unknown }).hoursType));
          }
        });
      }

      // Extract payment options
      if (data.paymentOptions && typeof data.paymentOptions === "object") {
        if (!facets.paymentOptions) facets.paymentOptions = new Set();
        const paymentOptionsSet = facets.paymentOptions;
        Object.keys(data.paymentOptions).forEach((key) => {
          if ((data.paymentOptions as Record<string, unknown>)[key]) {
            paymentOptionsSet.add(key);
          }
        });
      }

      // Extract fuel options (for gas stations)
      if (Array.isArray(data.fuelOptions)) {
        if (!facets.fuelOptions) facets.fuelOptions = new Set();
        const fuelOptionsSet = facets.fuelOptions;
        data.fuelOptions.forEach((fuel: string) => {
          fuelOptionsSet.add(fuel);
        });
      }

      // Extract EV charge options
      if (Array.isArray(data.evChargeOptions)) {
        if (!facets.evChargeOptions) facets.evChargeOptions = new Set();
        const evChargeOptionsSet = facets.evChargeOptions;
        data.evChargeOptions.forEach((opt: unknown) => {
          if (typeof opt === "object" && opt !== null && "connectorCount" in opt) {
            evChargeOptionsSet.add(String((opt as { connectorCount: unknown }).connectorCount));
          }
        });
      }

      // Extract parking options
      if (data.parkingOptions && typeof data.parkingOptions === "object") {
        if (!facets.parkingOptions) facets.parkingOptions = new Set();
        const parkingOptionsSet = facets.parkingOptions;
        Object.keys(data.parkingOptions).forEach((key) => {
          if ((data.parkingOptions as Record<string, unknown>)[key]) {
            parkingOptionsSet.add(key);
          }
        });
      }

      // Extract sub destinations (for airports, malls, etc.)
      if (Array.isArray(data.subDestinations)) {
        if (!facets.subDestinations) facets.subDestinations = new Set();
        const subDestinationsSet = facets.subDestinations;
        data.subDestinations.forEach((sub: unknown) => {
          if (typeof sub === "object" && sub !== null && "name" in sub) {
            subDestinationsSet.add(String((sub as { name: unknown }).name));
          }
        });
      }

      // Extract editorial summary (for categorization)
      if (data.editorialSummary?.text) {
        if (!facets.hasEditorialSummary) facets.hasEditorialSummary = new Set();
        facets.hasEditorialSummary.add("yes");
      }
    }

    // Convert Sets to arrays and sort
    const result: Record<string, (string | number)[]> = {};
    for (const [key, valueSet] of Object.entries(facets)) {
      result[key] = Array.from(valueSet).sort((a, b) => {
        if (typeof a === "number" && typeof b === "number") return a - b;
        return String(a).localeCompare(String(b));
      });
    }

    return result;
  },
});

/**
 * Search/filter places in a specific list with faceted search
 */
export const searchListPlaces = query({
  args: {
    listId: v.id("lists"),
    searchQuery: v.optional(v.string()),
    facets: v.optional(v.any()), // Object with facet field -> array of selected values
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get the list and check access
    const list = await ctx.db.get(args.listId);
    if (!list) {
      return [];
    }

    // Check if user has access (owner, public list, or shared)
    if (list.userId !== userId) {
      if (!list.isPublic) {
        const shared = await ctx.db
          .query("sharedLists")
          .withIndex("by_listId", (q) => q.eq("listId", args.listId))
          .filter((q) => q.eq(q.field("userId"), userId))
          .first();
        if (!shared) {
          return [];
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
        if (!place) {
          return null;
        }
        return {
          ...place,
          addedAt: listPlace.addedAt,
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
        const editorialSummary = place?.data?.editorialSummary?.text?.toLowerCase() || "";
        return (
          name.includes(query) ||
          address.includes(query) ||
          editorialSummary.includes(query)
        );
      });
    }

    // Filter by facets (same logic as searchPlaces)
    if (args.facets && typeof args.facets === "object") {
      const facets = args.facets as Record<string, (string | number)[]>;
      
      filtered = filtered.filter((place) => {
        if (!place?.data) return false;
        const data = place.data;

        // Check each facet filter
        for (const [facetKey, selectedValues] of Object.entries(facets)) {
          if (!selectedValues || selectedValues.length === 0) continue;

          let matches = false;

          switch (facetKey) {
            case "types": {
              const types = (data.types as string[]) || [];
              matches = selectedValues.some((val) => types.includes(String(val)));
              break;
            }

            case "priceLevel":
              matches = selectedValues.includes(data.priceLevel);
              break;

            case "rating":
              if (data.rating) {
                const ratingBucket = Math.floor(data.rating);
                matches = selectedValues.includes(ratingBucket);
              }
              break;

            case "businessStatus":
              matches = selectedValues.includes(data.businessStatus);
              break;

            case "accessibilityOptions": {
              const options = data.accessibilityOptions;
              if (options) {
                if (Array.isArray(options)) {
                  matches = selectedValues.some((val) =>
                    options.includes(String(val))
                  );
                } else if (typeof options === "object") {
                  matches = selectedValues.some((val) => (options as Record<string, unknown>)[String(val)]);
                }
              }
              break;
            }

            case "openingDays":
              if (data.currentOpeningHours?.weekdayDescriptions) {
                matches = selectedValues.some((val) => {
                  const dayPattern = new RegExp(`^${val}`, "i");
                  return data.currentOpeningHours.weekdayDescriptions.some((day: string) =>
                    dayPattern.test(day)
                  );
                });
              }
              break;

            case "secondaryHours": {
              const hours = data.secondaryHours;
              if (Array.isArray(hours)) {
                matches = selectedValues.some((val) =>
                  hours.some((h: unknown) => 
                    typeof h === "object" && h !== null && "hoursType" in h && (h as { hoursType: unknown }).hoursType === val
                  )
                );
              }
              break;
            }

            case "paymentOptions": {
              const options = data.paymentOptions;
              if (options && typeof options === "object") {
                matches = selectedValues.some((val) => (options as Record<string, unknown>)[String(val)]);
              }
              break;
            }

            case "fuelOptions": {
              const options = data.fuelOptions;
              if (Array.isArray(options)) {
                matches = selectedValues.some((val) =>
                  options.includes(String(val))
                );
              }
              break;
            }

            case "evChargeOptions": {
              const options = data.evChargeOptions;
              if (Array.isArray(options)) {
                matches = selectedValues.some((val) =>
                  options.some((opt: unknown) =>
                    typeof opt === "object" && opt !== null && "connectorCount" in opt &&
                    String((opt as { connectorCount: unknown }).connectorCount) === String(val)
                  )
                );
              }
              break;
            }

            case "parkingOptions": {
              const options = data.parkingOptions;
              if (options && typeof options === "object") {
                matches = selectedValues.some((val) => (options as Record<string, unknown>)[String(val)]);
              }
              break;
            }

            case "subDestinations": {
              const destinations = data.subDestinations;
              if (Array.isArray(destinations)) {
                matches = selectedValues.some((val) =>
                  destinations.some((sub: unknown) =>
                    typeof sub === "object" && sub !== null && "name" in sub &&
                    String((sub as { name: unknown }).name) === String(val)
                  )
                );
              }
              break;
            }

            case "hasEditorialSummary":
              matches = selectedValues.includes("yes") && !!data.editorialSummary?.text;
              break;

            default: {
              // Generic check for any other field
              const fieldValue = (data as Record<string, unknown>)[facetKey];
              if (Array.isArray(fieldValue)) {
                matches = selectedValues.some((val) => fieldValue.includes(val));
              } else if (typeof fieldValue === "object" && fieldValue !== null) {
                matches = selectedValues.some((val) => (fieldValue as Record<string, unknown>)[String(val)]);
              } else {
                matches = selectedValues.includes(fieldValue as string | number);
              }
              break;
            }
          }

          if (!matches) return false;
        }

        return true;
      });
    }

    return filtered;
  },
});


/**
 * Get facets for a public list (no authentication required)
 */
export const getPublicListFacets = query({
  args: {
    listId: v.id("lists"),
  },
  handler: async (ctx, args) => {
    // Get the list and check if it's public
    const list = await ctx.db.get(args.listId);
    if (!list || !list.isPublic) {
      return {};
    }

    // Get places in the list
    const listPlaces = await ctx.db
      .query("listPlaces")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .collect();

    const places = await Promise.all(
      listPlaces.map(async (listPlace) => {
        return await ctx.db.get(listPlace.placeId);
      })
    );

    const facets: Record<string, Set<string | number>> = {};

    // Extract facets from all places (same logic as getFacets)
    for (const place of places) {
      if (!place?.data) continue;

      const data = place.data;

      // Extract types (array)
      if (data.types && Array.isArray(data.types)) {
        if (!facets.types) facets.types = new Set();
        for (const type of data.types) {
          facets.types.add(type);
        }
      }

      // Extract priceLevel
      if (data.priceLevel !== undefined) {
        if (!facets.priceLevel) facets.priceLevel = new Set();
        facets.priceLevel.add(data.priceLevel);
      }

      // Extract rating (rounded)
      if (data.rating !== undefined) {
        if (!facets.rating) facets.rating = new Set();
        facets.rating.add(Math.floor(data.rating));
      }

      // Extract businessStatus
      if (data.businessStatus) {
        if (!facets.businessStatus) facets.businessStatus = new Set();
        facets.businessStatus.add(data.businessStatus);
      }

      // Extract accessibilityOptions
      if (data.accessibilityOptions) {
        if (!facets.accessibilityOptions) facets.accessibilityOptions = new Set();
        for (const option of Object.keys(data.accessibilityOptions)) {
          facets.accessibilityOptions.add(option);
        }
      }

      // Extract openingDays
      if (data.regularOpeningHours?.weekdayDescriptions) {
        if (!facets.openingDays) facets.openingDays = new Set();
        for (const day of data.regularOpeningHours.weekdayDescriptions) {
          facets.openingDays.add(day);
        }
      }

      // Extract paymentOptions
      if (data.paymentOptions) {
        if (!facets.paymentOptions) facets.paymentOptions = new Set();
        for (const option of Object.keys(data.paymentOptions)) {
          facets.paymentOptions.add(option);
        }
      }

      // Extract parkingOptions
      if (data.parkingOptions) {
        if (!facets.parkingOptions) facets.parkingOptions = new Set();
        for (const option of Object.keys(data.parkingOptions)) {
          facets.parkingOptions.add(option);
        }
      }

      // Extract subDestinations
      if (data.subDestinations && Array.isArray(data.subDestinations)) {
        if (!facets.subDestinations) facets.subDestinations = new Set();
        for (const sub of data.subDestinations) {
          if (sub && typeof sub === "object" && "name" in sub) {
            facets.subDestinations.add((sub as { name: string }).name);
          }
        }
      }

      // Extract hasEditorialSummary
      if (data.editorialSummary?.text) {
        if (!facets.hasEditorialSummary) facets.hasEditorialSummary = new Set();
        facets.hasEditorialSummary.add("yes");
      }
    }

    // Convert Sets to arrays and sort
    const result: Record<string, (string | number)[]> = {};
    for (const [key, valueSet] of Object.entries(facets)) {
      result[key] = Array.from(valueSet).sort((a, b) => {
        if (typeof a === "number" && typeof b === "number") return a - b;
        return String(a).localeCompare(String(b));
      });
    }

    return result;
  },
});

/**
 * Search/filter places in a public list (no authentication required)
 */
export const searchPublicListPlaces = query({
  args: {
    listId: v.id("lists"),
    searchQuery: v.optional(v.string()),
    facets: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get the list and check if it's public
    const list = await ctx.db.get(args.listId);
    if (!list || !list.isPublic) {
      return [];
    }

    // Get places in the list
    const listPlaces = await ctx.db
      .query("listPlaces")
      .withIndex("by_listId", (q) => q.eq("listId", args.listId))
      .collect();

    const places = await Promise.all(
      listPlaces.map(async (listPlace) => {
        const place = await ctx.db.get(listPlace.placeId);
        if (!place) {
          return null;
        }
        return {
          ...place,
          addedAt: listPlace.addedAt,
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
        const editorialSummary = place?.data?.editorialSummary?.text?.toLowerCase() || "";
        return (
          name.includes(query) ||
          address.includes(query) ||
          editorialSummary.includes(query)
        );
      });
    }

    // Filter by facets (same logic as searchListPlaces)
    if (args.facets && typeof args.facets === "object") {
      const facets = args.facets as Record<string, (string | number)[]>;
      
      filtered = filtered.filter((place) => {
        if (!place?.data) return false;
        const data = place.data;

        // Check each facet filter
        for (const [facetKey, selectedValues] of Object.entries(facets)) {
          if (!selectedValues || selectedValues.length === 0) continue;

          let matches = false;

          switch (facetKey) {
            case "types": {
              const types = (data.types as string[]) || [];
              matches = selectedValues.some((val) => types.includes(String(val)));
              break;
            }

            case "priceLevel":
              matches = selectedValues.includes(data.priceLevel);
              break;

            case "rating":
              if (data.rating) {
                const ratingBucket = Math.floor(data.rating);
                matches = selectedValues.includes(ratingBucket);
              }
              break;

            case "businessStatus":
              matches = selectedValues.includes(data.businessStatus);
              break;

            case "accessibilityOptions": {
              const options = data.accessibilityOptions;
              if (options) {
                if (Array.isArray(options)) {
                  matches = selectedValues.some((val) =>
                    options.includes(String(val))
                  );
                } else if (typeof options === "object") {
                  matches = selectedValues.some((val) => (options as Record<string, unknown>)[String(val)]);
                }
              }
              break;
            }

            case "openingDays":
              if (data.currentOpeningHours?.weekdayDescriptions) {
                matches = selectedValues.some((val) => {
                  const dayPattern = new RegExp(`^${val}`, "i");
                  return data.currentOpeningHours.weekdayDescriptions.some((day: string) =>
                    dayPattern.test(day)
                  );
                });
              }
              break;

            case "paymentOptions": {
              const options = data.paymentOptions;
              if (options && typeof options === "object") {
                matches = selectedValues.some((val) => (options as Record<string, unknown>)[String(val)]);
              }
              break;
            }

            case "parkingOptions": {
              const options = data.parkingOptions;
              if (options && typeof options === "object") {
                matches = selectedValues.some((val) => (options as Record<string, unknown>)[String(val)]);
              }
              break;
            }

            case "subDestinations": {
              const destinations = data.subDestinations;
              if (Array.isArray(destinations)) {
                matches = selectedValues.some((val) =>
                  destinations.some((sub: unknown) =>
                    typeof sub === "object" && sub !== null && "name" in sub &&
                    String((sub as { name: unknown }).name) === String(val)
                  )
                );
              }
              break;
            }

            case "hasEditorialSummary":
              matches = selectedValues.includes("yes") && !!data.editorialSummary?.text;
              break;

            default: {
              // Generic check for any other field
              const fieldValue = (data as Record<string, unknown>)[facetKey];
              if (Array.isArray(fieldValue)) {
                matches = selectedValues.some((val) => fieldValue.includes(val));
              } else if (typeof fieldValue === "object" && fieldValue !== null) {
                matches = selectedValues.some((val) => (fieldValue as Record<string, unknown>)[String(val)]);
              } else {
                matches = selectedValues.includes(fieldValue as string | number);
              }
              break;
            }
          }

          if (!matches) return false;
        }

        return true;
      });
    }

    return filtered;
  },
});
