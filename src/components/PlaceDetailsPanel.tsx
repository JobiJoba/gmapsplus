import { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, Phone, Globe, Clock, X } from "lucide-react";

interface PlaceDetailsPanelProps {
  placeId: string | null;
  open: boolean;
  onClose: () => void;
  onPlaceSaved?: () => void;
}

export function PlaceDetailsPanel({
  placeId,
  open,
  onClose,
  onPlaceSaved,
}: PlaceDetailsPanelProps) {
  const [placeData, setPlaceData] = useState<any>(null);
  const savePlace = useMutation(api.places.savePlace);
  const fetchPlaceDetails = useAction(api.googlePlaces.fetchPlaceDetails);
  const userPlaces = useQuery(api.places.getUserPlaces);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Find if this place is already saved
  const savedPlace = userPlaces?.find(
    (p) => p.data?.id === placeId || p.googlePlaceId === placeId
  );

  // Fetch place details if needed
  useEffect(() => {
    if (!placeId || !open) {
      setPlaceData(null);
      return;
    }

    if (savedPlace) {
      setPlaceData(savedPlace.data);
      setLoading(false);
    } else {
      // Fetch place details from Google Places API
      setLoading(true);
      fetchPlaceDetails({ placeId })
        .then((data) => {
          setPlaceData(data);
        })
        .catch((error) => {
          console.error("Error fetching place details:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [placeId, open, savedPlace, fetchPlaceDetails]);

  const handleSave = async () => {
    if (!placeId) return;
    setSaving(true);
    try {
      let placeDataToSave: any = null;
      
      if (!savedPlace) {
        // If we don't have place data yet, fetch it
        if (!placeData) {
          placeDataToSave = await fetchPlaceDetails({ placeId });
        } else {
          placeDataToSave = placeData;
        }
      }
      
      await savePlace({ 
        googlePlaceId: placeId,
        placeData: placeDataToSave || undefined,
      });
      onPlaceSaved?.();
    } catch (error) {
      console.error("Error saving place:", error);
      alert("Error saving place: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
    }
  };

  if (!open || !placeId) return null;

  const displayData = placeData || savedPlace?.data || {};

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 max-h-[60vh] overflow-y-auto bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg animate-in slide-in-from-bottom duration-300">
      <Card className="border-0 shadow-none rounded-none">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {displayData.displayName?.text || placeId || "Place Details"}
              </h3>
              {displayData.formattedAddress && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {displayData.formattedAddress}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {loading ? (
            <div className="py-4 text-center text-gray-500">Loading place details...</div>
          ) : (
            <div className="space-y-3">
              {/* Rating */}
              {displayData.rating && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-sm">{displayData.rating}</span>
                  {displayData.userRatingCount && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({displayData.userRatingCount} reviews)
                    </span>
                  )}
                </div>
              )}

              {/* Price Level */}
              {displayData.priceLevel && (
                <div>
                  <Badge variant="secondary" className="text-xs">
                    {"$".repeat(displayData.priceLevel)}
                  </Badge>
                </div>
              )}

              {/* Types */}
              {displayData.types && displayData.types.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {displayData.types.slice(0, 3).map((type: string) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Address */}
              {displayData.formattedAddress && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{displayData.formattedAddress}</span>
                </div>
              )}

              {/* Phone */}
              {displayData.nationalPhoneNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{displayData.nationalPhoneNumber}</span>
                </div>
              )}

              {/* Website */}
              {displayData.websiteUri && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <a
                    href={displayData.websiteUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Visit Website
                  </a>
                </div>
              )}

              {/* Opening Hours */}
              {displayData.currentOpeningHours && (
                <div className="flex items-start gap-2 text-sm">
                  <Clock className="h-4 w-4 mt-0.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1 text-gray-900 dark:text-white">Opening Hours</p>
                    {displayData.currentOpeningHours.weekdayDescriptions?.slice(0, 3).map(
                      (desc: string, i: number) => (
                        <p key={i} className="text-xs text-gray-600 dark:text-gray-400">
                          {desc}
                        </p>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                {savedPlace ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    Already Saved
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                  >
                    {saving ? "Saving..." : "Save Place"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

