import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, X, Trash2, Accessibility } from "lucide-react";
import { PlaceDetailsDialog } from "@/components/PlaceDetailsDialog";

export default function Places() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPriceRange, setSelectedPriceRange] = useState<number[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const places = useQuery(api.places.getUserPlaces);
  const removePlace = useMutation(api.places.removePlace);

  // Filter places based on search and filters
  const filteredPlaces = useMemo(() => {
    if (!places) return [];

    let filtered = [...places];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((place) => {
        const name = place.data?.displayName?.text?.toLowerCase() || "";
        const address = place.data?.formattedAddress?.toLowerCase() || "";
        return name.includes(query) || address.includes(query);
      });
    }

    // Filter by price range
    if (selectedPriceRange.length > 0) {
      filtered = filtered.filter((place) => {
        const priceLevel = place.data?.priceLevel;
        return priceLevel && selectedPriceRange.includes(priceLevel);
      });
    }

    // Filter by amenities
    if (selectedAmenities.length > 0) {
      filtered = filtered.filter((place) => {
        const types = place.data?.types || [];
        const hasToilet = types.some(
          (t: string) =>
            t.includes("restroom") ||
            t.includes("toilet") ||
            t.includes("bathroom"),
        );
        const hasParking = types.some(
          (t: string) => t.includes("parking") || place.data?.hasParking,
        );

        if (selectedAmenities.includes("Toilet") && !hasToilet) return false;
        if (selectedAmenities.includes("Parking") && !hasParking) return false;
        return true;
      });
    }

    return filtered;
  }, [places, searchQuery, selectedPriceRange, selectedAmenities]);

  const togglePriceRange = (level: number) => {
    setSelectedPriceRange((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    );
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity],
    );
  };

  const clearFilters = () => {
    setSelectedPriceRange([]);
    setSelectedAmenities([]);
  };

  const activeFilters = [
    ...selectedPriceRange.map((level) => "$".repeat(level)),
    ...selectedAmenities,
  ];

  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const getPlaceImage = (place: any) => {
    // Try to get photo from place data
    if (place.data?.photos && place.data.photos.length > 0) {
      const photo = place.data.photos[0];
      // Google Places API (New) uses photo name format
      if (photo.name) {
        return `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=400&maxWidthPx=400&key=${API_KEY}`;
      }
      // Fallback for old format
      if (photo.uri) return photo.uri;
    }
    // Fallback to a placeholder or default image
    return "https://via.placeholder.com/400x300?text=No+Image";
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      {/* Search Bar */}
      <div className="bg-card border-b border-border px-4 py-5">
        <div className="container mx-auto">
          <Input
            placeholder="Search a place ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-2xl w-full h-12 text-lg bg-background"
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 flex gap-6">
        {/* Left Sidebar - Filters */}
        <aside className="w-64 bg-card rounded-lg p-5 h-fit sticky top-24 border border-border">
          <div className="space-y-6">
            {/* Price Range */}
            <div>
              <h3 className="font-semibold mb-3 text-foreground">
                Price range
              </h3>
              <div className="space-y-2.5">
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className="flex items-center space-x-2.5 group"
                  >
                    <Checkbox
                      id={`price-${level}`}
                      checked={selectedPriceRange.includes(level)}
                      onCheckedChange={() => togglePriceRange(level)}
                    />
                    <label
                      htmlFor={`price-${level}`}
                      className="text-sm font-medium cursor-pointer text-foreground group-hover:text-primary transition-colors"
                    >
                      {"$".repeat(level)}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="font-semibold mb-3 text-foreground">Amenities</h3>
              <div className="space-y-2.5">
                {["Toilet", "Parking"].map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center space-x-2.5 group"
                  >
                    <Checkbox
                      id={`amenity-${amenity}`}
                      checked={selectedAmenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    <label
                      htmlFor={`amenity-${amenity}`}
                      className="text-sm font-medium cursor-pointer text-foreground group-hover:text-primary transition-colors"
                    >
                      {amenity}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Selected Filters Bar */}
          {activeFilters.length > 0 && (
            <div className="bg-secondary border border-border rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Selected filters:
                </span>
                <div className="flex gap-2 flex-wrap">
                  {activeFilters.map((filter, idx) => (
                    <Badge key={idx} variant="secondary" className="text-sm">
                      {filter}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Place Cards */}
          {!places ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading places...</p>
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {places.length === 0
                  ? "No places saved yet"
                  : "No places match your filters"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPlaces.map((place) => {
                const imageUrl = getPlaceImage(place);
                const rating = place.data?.rating;
                const reviewCount = place.data?.userRatingCount;
                const priceLevel = place.data?.priceLevel;
                const types = place.data?.types || [];
                const primaryType = types[0]?.replace(/_/g, " ") || "Place";
                const hasWheelchair = types.some((t: string) =>
                  t.includes("wheelchair"),
                );

                return (
                  <Card
                    key={place._id}
                    className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer"
                    onClick={() => {
                      setSelectedPlaceId(place.googlePlaceId);
                      setDialogOpen(true);
                    }}
                  >
                    <div className="flex">
                      {/* Image */}
                      <div className="w-64 h-48 shrink-0 relative overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={place.data?.displayName?.text || "Place"}
                          className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/10 to-transparent" />
                      </div>

                      {/* Content */}
                      <CardContent className="p-6 flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-xl font-semibold text-card-foreground">
                            {place.data?.displayName?.text || "Unknown Place"}
                          </h3>
                          {hasWheelchair && (
                            <Accessibility className="h-5 w-5 text-primary" />
                          )}
                        </div>

                        {place.data?.formattedAddress && (
                          <p className="text-sm text-muted-foreground mb-4">
                            {place.data.formattedAddress}
                          </p>
                        )}

                        <div className="flex items-center gap-4 flex-wrap mb-4">
                          {/* Rating */}
                          {rating && (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-card-foreground">
                                {rating}
                              </span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= Math.round(rating)
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-muted-foreground/30"
                                    }`}
                                  />
                                ))}
                              </div>
                              {reviewCount && (
                                <span className="text-sm text-muted-foreground">
                                  ({reviewCount.toLocaleString()})
                                </span>
                              )}
                            </div>
                          )}

                          {/* Price Range */}
                          {priceLevel && priceLevel > 0 && (
                            <Badge variant="outline" className="text-sm">
                              ฿
                              {priceLevel === 1
                                ? "100-300"
                                : priceLevel === 2
                                  ? "300-600"
                                  : priceLevel === 3
                                    ? "600-1000"
                                    : "1000+"}
                            </Badge>
                          )}

                          {/* Type */}
                          <Badge variant="secondary" className="text-sm">
                            {primaryType}
                          </Badge>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (place.userPlaceId) {
                                void removePlace({
                                  userPlaceId: place.userPlaceId,
                                });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <PlaceDetailsDialog
        placeId={selectedPlaceId}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedPlaceId(null);
          }
        }}
        onPlaceSaved={() => {
          // Refetch places
        }}
      />
    </div>
  );
}
