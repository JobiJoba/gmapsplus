import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shuffle, MapPin, Star } from "lucide-react";
import { Wheel } from "@/components/Wheel";

export default function WheelPage() {
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  
  const userPlaces = useQuery(api.places.getUserPlaces);

  // Extract available types from user places
  const availableTypes = useMemo(() => {
    if (!userPlaces) return [];
    const typesSet = new Set<string>();
    userPlaces.forEach((place) => {
      if (place.data?.types && Array.isArray(place.data.types)) {
        place.data.types.forEach((type: string) => {
          typesSet.add(type);
        });
      }
    });
    return Array.from(typesSet).sort();
  }, [userPlaces]);

  // Filter places by selected types
  const filteredPlaces = useMemo(() => {
    if (!userPlaces) return [];
    if (selectedTypes.size === 0) return userPlaces;
    return userPlaces.filter((place) => {
      if (!place.data?.types || !Array.isArray(place.data.types)) return false;
      return place.data.types.some((type: string) => selectedTypes.has(type));
    });
  }, [userPlaces, selectedTypes]);

  const selectedPlaces = useMemo(() => {
    if (!filteredPlaces) return [];
    return filteredPlaces.filter((place) =>
      selectedPlaceIds.has(place._id)
    );
  }, [filteredPlaces, selectedPlaceIds]);

  const togglePlace = (placeId: string) => {
    const newSet = new Set(selectedPlaceIds);
    if (newSet.has(placeId)) {
      newSet.delete(placeId);
    } else {
      newSet.add(placeId);
    }
    setSelectedPlaceIds(newSet);
  };

  const toggleType = (type: string) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedTypes(newSet);
  };

  const toggleSelectAll = () => {
    const allSelected = filteredPlaces.every((place) =>
      selectedPlaceIds.has(place._id)
    );
    const newSet = new Set(selectedPlaceIds);
    if (allSelected) {
      // Deselect all filtered places
      filteredPlaces.forEach((place) => {
        newSet.delete(place._id);
      });
    } else {
      // Select all filtered places
      filteredPlaces.forEach((place) => {
        newSet.add(place._id);
      });
    }
    setSelectedPlaceIds(newSet);
  };

  const handleSpin = () => {
    if (selectedPlaces.length === 0) {
      alert("Please select at least one place!");
      return;
    }

    setIsSpinning(true);
    // Simulate spinning animation
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * selectedPlaces.length);
      setSelectedPlace(selectedPlaces[randomIndex]);
      setIsSpinning(false);
    }, 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Wheel of Places</h1>
        <p className="text-muted-foreground">
          Select places and let the wheel decide where to go next!
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Place Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Places</CardTitle>
            <CardDescription>
              Choose the places you want to include in the wheel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!userPlaces || userPlaces.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No places saved yet. Save some places first!
                </p>
              </div>
            ) : (
              <>
                {/* Types Filter */}
                {availableTypes.length > 0 && (
                  <div className="mb-4 pb-4 border-b">
                    <h3 className="text-sm font-semibold mb-2">Filter by Type</h3>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {availableTypes.map((type) => {
                        const isSelected = selectedTypes.has(type);
                        return (
                          <Badge
                            key={type}
                            variant={isSelected ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleType(type)}
                          >
                            {type.replace(/_/g, " ")}
                          </Badge>
                        );
                      })}
                    </div>
                    {selectedTypes.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 text-xs"
                        onClick={() => setSelectedTypes(new Set())}
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                )}
                {filteredPlaces.length > 0 && (
                  <div className="mb-3 pb-3 border-b">
                    <div
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={toggleSelectAll}
                    >
                      <Checkbox
                        checked={
                          filteredPlaces.length > 0 &&
                          filteredPlaces.every((place) =>
                            selectedPlaceIds.has(place._id)
                          )
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                      <span className="font-semibold text-sm">
                        Select All ({filteredPlaces.length})
                      </span>
                    </div>
                  </div>
                )}
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredPlaces.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No places match the selected filters
                      </p>
                    </div>
                  ) : (
                    filteredPlaces.map((place) => {
                  const isSelected = selectedPlaceIds.has(place._id);
                  return (
                    <div
                      key={place._id}
                      className="flex items-start gap-3 p-3 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => togglePlace(place._id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => togglePlace(place._id)}
                      />
                      <div className="flex-1">
                        <p className="font-semibold">
                          {place.data?.displayName?.text || "Unknown Place"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {place.data?.formattedAddress || "No address"}
                        </p>
                        {place.data?.rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs">{place.data.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Wheel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spin the Wheel</CardTitle>
              <CardDescription>
                {selectedPlaces.length} place{selectedPlaces.length !== 1 ? "s" : ""} selected
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {selectedPlaces.length > 0 ? (
                <>
                  <Wheel
                    items={selectedPlaces.map((p) => ({
                      id: p._id,
                      label: p.data?.displayName?.text || "Unknown Place",
                    }))}
                    isSpinning={isSpinning}
                    onSpinComplete={(item) => {
                      const place = selectedPlaces.find((p) => p._id === item.id);
                      setSelectedPlace(place);
                    }}
                  />
                  <Button
                    onClick={handleSpin}
                    disabled={isSpinning || selectedPlaces.length === 0}
                    size="lg"
                    className="mt-6"
                  >
                    <Shuffle className="h-5 w-5 mr-2" />
                    {isSpinning ? "Spinning..." : "Spin!"}
                  </Button>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Select places from the list to start spinning
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Result */}
          {selectedPlace && !isSpinning && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Place</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold">
                    {selectedPlace.data?.displayName?.text || "Unknown Place"}
                  </h3>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedPlace.data?.formattedAddress || "No address"}</span>
                  </div>
                  {selectedPlace.data?.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">
                        {selectedPlace.data.rating}
                      </span>
                      {selectedPlace.data.userRatingCount && (
                        <span className="text-sm text-muted-foreground">
                          ({selectedPlace.data.userRatingCount} reviews)
                        </span>
                      )}
                    </div>
                  )}
                  {selectedPlace.data?.types && selectedPlace.data.types.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedPlace.data.types.slice(0, 5).map((type: string) => (
                        <Badge key={type} variant="outline">
                          {type.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


