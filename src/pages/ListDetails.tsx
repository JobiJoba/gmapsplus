import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Star, X, Trash2, Accessibility, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlaceDetailsDialog } from "@/components/PlaceDetailsDialog";
import { formatFilterLabel } from "@/lib/filterLabels";

type FacetSelections = Record<string, (string | number)[]>;

export default function ListDetails() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFacets, setSelectedFacets] = useState<FacetSelections>({});
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addPlaceDialogOpen, setAddPlaceDialogOpen] = useState(false);
  const [selectedPlaceIdToAdd, setSelectedPlaceIdToAdd] = useState<string>("");

  const userId = useQuery(api.myFunctions.getCurrentUserId);
  const list = useQuery(
    api.lists.getListById,
    listId ? { listId: listId as any } : "skip"
  );
  const facets = useQuery(
    api.places.getListFacets,
    listId ? { listId: listId as any } : "skip"
  );
  const places = useQuery(
    api.places.searchListPlaces,
    listId
      ? {
          listId: listId as any,
          searchQuery: searchQuery || undefined,
          facets: Object.keys(selectedFacets).length > 0 ? selectedFacets : undefined,
        }
      : "skip"
  );
  const userPlaces = useQuery(api.places.getUserPlaces);
  const deleteList = useMutation(api.lists.deleteList);
  const removePlaceFromList = useMutation(api.lists.removePlaceFromList);
  const addPlaceToList = useMutation(api.lists.addPlaceToList);

  const isOwner = list && userId && list.userId === userId;

  const formatFacetTitle = (key: string): string => {
    const titles: Record<string, string> = {
      types: "Types",
      priceLevel: "Price Level",
      rating: "Rating",
      businessStatus: "Business Status",
      accessibilityOptions: "Accessibility",
      openingDays: "Opening Days",
      secondaryHours: "Special Hours",
      paymentOptions: "Payment Options",
      fuelOptions: "Fuel Options",
      evChargeOptions: "EV Charging",
      parkingOptions: "Parking",
      subDestinations: "Sub Destinations",
      hasEditorialSummary: "Has Description",
    };
    return titles[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
  };

  const toggleFacet = (facetKey: string, value: string | number) => {
    setSelectedFacets((prev) => {
      const current = prev[facetKey] || [];
      const newValue = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];

      if (newValue.length === 0) {
        const { [facetKey]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [facetKey]: newValue };
    });
  };

  const clearFilters = () => {
    setSelectedFacets({});
  };

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string }> = [];
    for (const [key, values] of Object.entries(selectedFacets)) {
      for (const value of values) {
        filters.push({ key, label: formatFilterLabel(key, value) });
      }
    }
    return filters;
  }, [selectedFacets]);

  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const getPlaceImage = (place: any) => {
    if (place.data?.photos && place.data.photos.length > 0) {
      const photo = place.data.photos[0];
      if (photo.name) {
        return `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=400&maxWidthPx=400&key=${API_KEY}`;
      }
      if (photo.uri) return photo.uri;
    }
    return "https://via.placeholder.com/400x300?text=No+Image";
  };

  const handleAddPlace = async () => {
    if (!listId || !selectedPlaceIdToAdd) return;
    try {
      await addPlaceToList({
        listId: listId as any,
        placeId: selectedPlaceIdToAdd as any,
      });
      setSelectedPlaceIdToAdd("");
      setAddPlaceDialogOpen(false);
    } catch (error) {
      console.error("Error adding place:", error);
    }
  };

  if (!list) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-5">
        <div className="container mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/app/lists")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lists
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{list.name}</h1>
              <p className="text-muted-foreground">{list.description || "No description"}</p>
            </div>
            {isOwner && (
              <div className="flex gap-2">
                <Dialog open={addPlaceDialogOpen} onOpenChange={setAddPlaceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Place
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Place to List</DialogTitle>
                      <DialogDescription>
                        Select a place from your saved places
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Select value={selectedPlaceIdToAdd} onValueChange={setSelectedPlaceIdToAdd}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a place..." />
                        </SelectTrigger>
                        <SelectContent>
                          {userPlaces
                            ?.filter(
                              (place) =>
                                !places?.some((p: any) => p._id === place._id)
                            )
                            .map((place) => (
                              <SelectItem key={place._id} value={place._id}>
                                {place.data?.displayName?.text || "Unknown Place"}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={() => void handleAddPlace()} className="w-full" disabled={!selectedPlaceIdToAdd}>
                        Add to List
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this list?")) {
                      void deleteList({ listId: listId as any });
                      navigate("/app/lists");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-card border-b border-border px-4 py-5">
        <div className="container mx-auto">
          <Input
            placeholder="Search places in this list..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-2xl w-full h-12 text-lg bg-background"
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 flex gap-6">
        {/* Left Sidebar - Filters */}
        <aside className="w-64 bg-card rounded-lg p-5 h-fit sticky top-24 border border-border max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="space-y-6">
            {facets && Object.keys(facets).length > 0 ? (
              Object.entries(facets).map(([facetKey, values]) => {
                if (!values || values.length === 0) return null;

                return (
                  <div key={facetKey}>
                    <h3 className="font-semibold mb-3 text-foreground">
                      {formatFacetTitle(facetKey)}
                    </h3>
                    <div className="space-y-2.5 max-h-64 overflow-y-auto">
                      {values.map((value) => {
                        const isSelected = selectedFacets[facetKey]?.includes(value) || false;
                        const id = `${facetKey}-${value}`;

                        return (
                          <div
                            key={id}
                            className="flex items-center space-x-2.5 group"
                          >
                            <Checkbox
                              id={id}
                              checked={isSelected}
                              onCheckedChange={() => toggleFacet(facetKey, value)}
                            />
                            <label
                              htmlFor={id}
                              className="text-sm font-medium cursor-pointer text-foreground group-hover:text-primary transition-colors flex-1 truncate"
                              title={formatFilterLabel(facetKey, value)}
                            >
                              {formatFilterLabel(facetKey, value)}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-muted-foreground">
                No filters available
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Selected Filters Bar */}
          {activeFilters.length > 0 && (
            <div className="bg-secondary border border-border rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium text-foreground shrink-0">
                  Selected filters:
                </span>
                <div className="flex gap-2 flex-wrap">
                  {activeFilters.map((filter, idx) => (
                    <Badge key={idx} variant="secondary" className="text-sm">
                      {filter.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 w-8 p-0 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Place Cards */}
          {places === undefined ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading places...</p>
            </div>
          ) : places.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery || Object.keys(selectedFacets).length > 0
                  ? "No places match your filters"
                  : "No places in this list yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {places.map((place: any) => {
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

                        {isOwner && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (listId) {
                                  void removePlaceFromList({
                                    listId: listId as any,
                                    placeId: place._id,
                                  });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        )}
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
