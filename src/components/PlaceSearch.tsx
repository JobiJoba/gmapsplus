import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { PlaceDetailsDialog } from "./PlaceDetailsDialog";

export function PlaceSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);

  // Use the Places library from the APIProvider context
  const placesLibrary = useMapsLibrary("places");

  useEffect(() => {
    if (placesLibrary && window.google?.maps?.places) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    }
  }, [placesLibrary]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !autocompleteServiceRef.current) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    void autocompleteServiceRef.current.getPlacePredictions(
      {
        input: query,
        types: ["establishment"],
      },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setPredictions(predictions);
          setShowPredictions(true);
        } else {
          setPredictions([]);
          setShowPredictions(false);
        }
      }
    );
  };

  const handleSelectPlace = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setSearchQuery("");
    setPredictions([]);
    setShowPredictions(false);
    setDialogOpen(true);
  };

  if (!placesLibrary || !autocompleteServiceRef.current) {
    return null;
  }

  return (
    <>
      <div className="absolute top-4 left-4 z-10 w-full max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search for places..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => {
              if (predictions.length > 0) {
                setShowPredictions(true);
              }
            }}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
              onClick={() => {
                setSearchQuery("");
                setPredictions([]);
                setShowPredictions(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {showPredictions && predictions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto z-20">
              {predictions.map((prediction) => (
                <button
                  key={prediction.place_id}
                  className="w-full text-left px-4 py-2 hover:bg-muted cursor-pointer"
                  onClick={() => handleSelectPlace(prediction.place_id)}
                >
                  <div className="font-medium">{prediction.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <PlaceDetailsDialog
        placeId={selectedPlaceId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onPlaceSaved={() => {
          setSelectedPlaceId(null);
        }}
      />
    </>
  );
}

