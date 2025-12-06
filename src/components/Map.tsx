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

  // useEffect(() => {
  //   if (map && userPlaces && userPlaces.length > 0) {
  //     // Fit bounds to show all markers
  //     const bounds = new google.maps.LatLngBounds();
  //     userPlaces.forEach((place) => {
  //       const location = place.data?.location;
  //       if (location?.latitude && location?.longitude) {
  //         bounds.extend({
  //           lat: location.latitude,
  //           lng: location.longitude,
  //         });
  //       }
  //     });
  //     if (!bounds.isEmpty()) {
  //       map.fitBounds(bounds);
  //     }
  //   }
  // }, [map, userPlaces]);

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
        radius: 100, // Increased radius to 100 meters for better detection
        type: "establishment", // Search for establishments
      };

      placesService.nearbySearch(request, (results, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          results &&
          results.length > 0
        ) {
          // Filter out routes and other non-place types
          const validPlaces = results.filter((place) => {
            const types = place.types || [];
            // Exclude route types
            return !types.some(
              (type) =>
                type === "route" ||
                type === "street_address" ||
                type === "premise" ||
                type === "subpremise",
            );
          });

          if (validPlaces.length > 0) {
            // Calculate distance and get the closest valid place
            const clickedLat = event.latLng!.lat();
            const clickedLng = event.latLng!.lng();

            const closestPlace = validPlaces.reduce((closest, current) => {
              const currentLocation = current.geometry?.location;
              const closestLocation = closest.geometry?.location;

              if (!currentLocation || !closestLocation) return closest;

              const currentDist = Math.sqrt(
                Math.pow(currentLocation.lat() - clickedLat, 2) +
                  Math.pow(currentLocation.lng() - clickedLng, 2),
              );
              const closestDist = Math.sqrt(
                Math.pow(closestLocation.lat() - clickedLat, 2) +
                  Math.pow(closestLocation.lng() - clickedLng, 2),
              );

              return currentDist < closestDist ? current : closest;
            });

            if (closestPlace.place_id) {
              onPlaceSelect(closestPlace.place_id);
            }
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
  const defaultLocation = { lat: 18.7883, lng: 98.9853 }; // Chiang Mai fallback
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  }>(defaultLocation);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsLoadingLocation(false);
        },
        () => {
          // Fallback to default location if geolocation fails
          setIsLoadingLocation(false);
        },
      );
    } else {
      // Fallback if geolocation is not supported - defer state update
      setTimeout(() => setIsLoadingLocation(false), 0);
    }
  }, []);

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

  // Show loading state while getting user location
  if (isLoadingLocation) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <p>Getting your location...</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} libraries={["places"]}>
      <div className="w-full h-full relative">
        <PlaceSearch onPlaceSelect={handlePlaceSelect} />
        <Map
          defaultCenter={userLocation}
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
