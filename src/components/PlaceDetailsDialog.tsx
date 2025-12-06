import { useState, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, MapPin, Phone, Globe, Clock } from "lucide-react";

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

  // If place is saved, use its data; otherwise we'll need to fetch it
  useEffect(() => {
    if (savedPlace) {
      setPlaceData(savedPlace.data);
    } else if (placeId && open) {
      // For unsaved places, we'd need to fetch details
      // For now, we'll show basic info from the placeId
      setPlaceData(null);
    }
  }, [savedPlace, placeId, open]);

  const handleSave = async () => {
    if (!placeId) return;
    setSaving(true);
    try {
      // First, check if place exists in database
      // If not, fetch place data from Google Places API
      let placeDataToSave: any = null;
      
      // Check if we already have the place data
      if (!savedPlace) {
        // Fetch place details from Google Places API
        placeDataToSave = await fetchPlaceDetails({ placeId });
      }
      
      // Save the place (mutation will use existing place if it exists, or save new one with data)
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {displayData.displayName?.text || placeId || "Place Details"}
          </DialogTitle>
          <DialogDescription>
            {displayData.formattedAddress || "Loading place details..."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">Loading place details...</div>
        ) : (
          <div className="space-y-4 mt-4">
            {/* Rating */}
            {displayData.rating && (
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{displayData.rating}</span>
                {displayData.userRatingCount && (
                  <span className="text-sm text-muted-foreground">
                    ({displayData.userRatingCount} reviews)
                  </span>
                )}
              </div>
            )}

            {/* Price Level */}
            {displayData.priceLevel && (
              <div>
                <Badge variant="secondary">
                  {"$".repeat(displayData.priceLevel)}
                </Badge>
              </div>
            )}

            {/* Types */}
            {displayData.types && displayData.types.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {displayData.types.slice(0, 5).map((type: string) => (
                  <Badge key={type} variant="outline">
                    {type.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            )}

            {/* Address */}
            {displayData.formattedAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <span>{displayData.formattedAddress}</span>
              </div>
            )}

            {/* Phone */}
            {displayData.nationalPhoneNumber && (
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <span>{displayData.nationalPhoneNumber}</span>
              </div>
            )}

            {/* Website */}
            {displayData.websiteUri && (
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <a
                  href={displayData.websiteUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Visit Website
                </a>
              </div>
            )}

            {/* Opening Hours */}
            {displayData.currentOpeningHours && (
              <div className="flex items-start gap-2">
                <Clock className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold mb-1">Opening Hours</p>
                  {displayData.currentOpeningHours.weekdayDescriptions?.map(
                    (desc: string, i: number) => (
                      <p key={i} className="text-sm">
                        {desc}
                      </p>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Photos */}
            {displayData.photos && displayData.photos.length > 0 && (
              <div>
                <p className="font-semibold mb-2">Photos</p>
                <div className="grid grid-cols-2 gap-2">
                  {displayData.photos.slice(0, 4).map((photo: any, i: number) => (
                    <img
                      key={i}
                      src={photo.uri || photo.name}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-32 object-cover rounded-md"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t">
              {savedPlace ? (
                <>
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
                </>
              ) : (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save to App"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

