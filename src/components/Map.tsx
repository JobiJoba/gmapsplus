import { useState, useEffect } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { PlaceDetailsPanel } from "./PlaceDetailsPanel";
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
  const [panelOpen, setPanelOpen] = useState(false);

  const handlePlaceSelect = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setPanelOpen(true);
  };

  if (!API_KEY) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <p className="text-lg font-semibold mb-2">Google Maps API Key Required</p>
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
        <PlaceDetailsPanel
          placeId={selectedPlaceId}
          open={panelOpen}
          onClose={() => {
            setPanelOpen(false);
            setSelectedPlaceId(null);
          }}
          onPlaceSaved={() => {
            // Refetch places
          }}
        />
      </div>
    </APIProvider>
  );
}

