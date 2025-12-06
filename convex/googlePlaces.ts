import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Fetch place details from Google Places API using fieldMask: "*" to get all fields
 * Uses the new Places API (New) endpoint
 */
export const fetchPlaceDetails = action({
  args: {
    placeId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY environment variable is not set");
    }

    // Use the new Places API (New) endpoint
    const url = `https://places.googleapis.com/v1/places/${args.placeId}`;

    // Use fieldMask: "*" to get all available fields via header
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "*",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Places API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    return data;
  },
});

