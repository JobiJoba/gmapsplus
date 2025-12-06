import { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MapPin, Phone, Globe, Clock, Save, ExternalLink } from "lucide-react";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

// Helper function to construct photo URL from Google Places API (New) photo name
function getPhotoUrl(photoName: string): string {
  if (!photoName || !API_KEY) return "";
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${API_KEY}`;
}

interface PlaceDetailsDialogProps {
  placeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaceSaved?: () => void;
}

export function PlaceDetailsDialog({
  placeId,
  open,
  onOpenChange,
  onPlaceSaved,
}: PlaceDetailsDialogProps) {
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [placeData, setPlaceData] = useState<any>(null);
  const savePlace = useMutation(api.places.savePlace);
  const removePlace = useMutation(api.places.removePlace);
  const addPlaceToList = useMutation(api.lists.addPlaceToList);
  const fetchPlaceDetails = useAction(api.googlePlaces.fetchPlaceDetails);
  const userPlaces = useQuery(api.places.getUserPlaces);
  const userLists = useQuery(api.lists.getUserLists);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Find if this place is already saved
  const savedPlace = userPlaces?.find(
    (p) => p.data?.id === placeId || p.googlePlaceId === placeId
  );

  // Fetch place details when dialog opens
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
        // Use already fetched data if available, otherwise fetch it
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

  const handleRemove = async () => {
    if (!savedPlace?.userPlaceId) return;
    setSaving(true);
    try {
      await removePlace({ userPlaceId: savedPlace.userPlaceId });
      onPlaceSaved?.();
    } catch (error) {
      console.error("Error removing place:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddToList = async () => {
    if (!selectedListId || !savedPlace?._id) return;
    try {
      await addPlaceToList({
        listId: selectedListId as any,
        placeId: savedPlace._id,
      });
      setSelectedListId("");
    } catch (error) {
      console.error("Error adding to list:", error);
    }
  };

  if (!placeId) return null;

  // Use saved place data if available, otherwise show loading/placeholder
  const displayData = placeData || savedPlace?.data || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {displayData.displayName?.text || placeId || "Place Details"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center px-6">Loading place details...</div>
        ) : (
          <div className="px-6 pb-6 space-y-4">
            {/* Save Button - Prominent at top */}
            {!savedPlace && (
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-medium"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save to my places"}
              </Button>
            )}

            {/* Photo */}
            {displayData.photos && displayData.photos.length > 0 && displayData.photos[0].name && (
              <div className="w-full h-64 rounded-lg overflow-hidden">
                <img
                  src={getPhotoUrl(displayData.photos[0].name)}
                  alt={displayData.displayName?.text || "Place photo"}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Rating and Category */}
            <div className="flex items-center gap-3">
              {displayData.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-base">{displayData.rating}</span>
                  {displayData.userRatingCount && (
                    <span className="text-sm text-gray-600">
                      ({displayData.userRatingCount.toLocaleString()} reviews)
                    </span>
                  )}
                </div>
              )}
              {displayData.types && displayData.types.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {displayData.types[0].replace(/_/g, " ")}
                </Badge>
              )}
            </div>

            {/* Address */}
            {displayData.formattedAddress && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                <span className="text-gray-700">{displayData.formattedAddress}</span>
              </div>
            )}

            {/* Phone */}
            {displayData.nationalPhoneNumber && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-700">{displayData.nationalPhoneNumber}</span>
              </div>
            )}

            {/* Opening Hours */}
            {displayData.currentOpeningHours && (
              <div className="space-y-1">
                <p className="font-semibold text-sm mb-2">Opening Hours</p>
                {displayData.currentOpeningHours.weekdayDescriptions?.map(
                  (desc: string, i: number) => (
                    <p key={i} className="text-sm text-gray-700">
                      {desc}
                    </p>
                  )
                )}
              </div>
            )}

            {/* Links */}
            <div className="flex flex-col gap-2 pt-2">
              {displayData.websiteUri && (
                <a
                  href={displayData.websiteUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                >
                  Visit Website <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {displayData.googleMapsUri && (
                <a
                  href={displayData.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                >
                  View on Google Maps <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Actions for saved places */}
            {savedPlace && (
              <div className="flex flex-col gap-3 pt-4 border-t">
                <Button variant="destructive" onClick={handleRemove} disabled={saving}>
                  Remove from Saved Places
                </Button>
                {userLists && userLists.length > 0 && (
                  <div className="flex gap-2">
                    <Select value={selectedListId} onValueChange={setSelectedListId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add to list..." />
                      </SelectTrigger>
                      <SelectContent>
                        {userLists.map((list) => (
                          <SelectItem key={list._id} value={list._id}>
                            {list.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAddToList}
                      disabled={!selectedListId}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

