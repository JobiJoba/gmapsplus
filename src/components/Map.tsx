import { useState, useEffect } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PlaceDetailsDialog } from "./PlaceDetailsDialog";
import { PlaceSearch } from "./PlaceSearch";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

interface MapContentProps {
  onPlaceSelect: (placeId: string) => void;
}

function MapContent({ onPlaceSelect }: MapContentProps) {
  const userPlaces = useQuery(api.places.getUserPlaces);
  const map = useMap();

  useEffect(() => {
    if (map && userPlaces && userPlaces.length > 0) {
      // Fit bounds to show all markers
      const bounds = new google.maps.LatLngBounds();
      userPlaces.forEach((place) => {
        const location = place.data?.location;
        if (location?.latitude && location?.longitude) {
          bounds.extend({
            lat: location.latitude,
            lng: location.longitude,
          });
        }
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
      }
    }
  }, [map, userPlaces]);

  // Handle clicks on default Google Maps markers
  useEffect(() => {
    if (!map) return;

    const handleMapClick = (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;

      // Use PlacesService to find nearby places at the clicked location
      // This will detect clicks on Google Maps default markers
      const placesService = new google.maps.places.PlacesService(map);
      const request = {
        location: event.latLng,
        radius: 50, // Search within 50 meters
        type: "establishment",
      };

      placesService.nearbySearch(request, (results, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          results &&
          results.length > 0
        ) {
          // Get the closest place
          const place = results[0];
          if (place.place_id) {
            onPlaceSelect(place.place_id);
          }
        }
      });
    };

    const listener = map.addListener("click", handleMapClick);

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [map, onPlaceSelect]);

  if (!userPlaces) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p>Loading places...</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full relative">
        {userPlaces.map((place) => {
          const location = place.data?.location;
          if (!location?.latitude || !location?.longitude) return null;

          return (
            <Marker
              key={place._id}
              position={{
                lat: location.latitude,
                lng: location.longitude,
              }}
              onClick={() => {
                onPlaceSelect(place.googlePlaceId);
              }}
              title={place.data?.displayName?.text || "Place"}
            />
          );
        })}
      </div>
    </>
  );
}

export default function MapComponent() {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handlePlaceSelect = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setDialogOpen(true);
  };

  if (!API_KEY) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <p className="text-lg font-semibold mb-2">
            Google Maps API Key Required
          </p>
          <p className="text-sm text-gray-600">
            Please set VITE_GOOGLE_MAPS_API_KEY in your environment variables
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} libraries={["places"]}>
      <div className="w-full h-full relative">
        <PlaceSearch onPlaceSelect={handlePlaceSelect} />
        <Map
          defaultCenter={{ lat: 18.7883, lng: 98.9853 }} // Chiang Mai default
          defaultZoom={13}
          mapId="gmapsplus-map"
          fullscreenControl={false}
          streetViewControl={false}
        >
          <MapContent onPlaceSelect={handlePlaceSelect} />
        </Map>
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
    </APIProvider>
  );
}
