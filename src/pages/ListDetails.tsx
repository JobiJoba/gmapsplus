import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Share2, Trash2, Star, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ListDetails() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [addPlaceDialogOpen, setAddPlaceDialogOpen] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>("");

  const list = useQuery(
    api.lists.getListById,
    listId ? { listId: listId as any } : "skip"
  );
  const userPlaces = useQuery(api.places.getUserPlaces);
  const deleteList = useMutation(api.lists.deleteList);
  const removePlaceFromList = useMutation(api.lists.removePlaceFromList);
  const addPlaceToList = useMutation(api.lists.addPlaceToList);
  const generateShareToken = useMutation(api.lists.generateShareToken);

  const handleShare = async () => {
    if (!listId) return;
    try {
      const token = await generateShareToken({ listId: listId as any });
      const shareUrl = `${window.location.origin}/shared/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      alert("Share link copied to clipboard!");
    } catch (error) {
      console.error("Error generating share token:", error);
    }
  };

  const handleAddPlace = async () => {
    if (!listId || !selectedPlaceId) return;
    try {
      await addPlaceToList({
        listId: listId as any,
        placeId: selectedPlaceId as any,
      });
      setSelectedPlaceId("");
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
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
          <div className="flex gap-2">
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share List</DialogTitle>
                  <DialogDescription>
                    Copy the link below to share this list
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Button onClick={() => void handleShare()} className="w-full">
                    Generate Share Link
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
        </div>
      </div>

      <div className="mb-4">
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
              <Select value={selectedPlaceId} onValueChange={setSelectedPlaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a place..." />
                </SelectTrigger>
                <SelectContent>
                  {userPlaces
                    ?.filter(
                      (place) =>
                        !list.places.some((p) => p._id === place._id)
                    )
                    .map((place) => (
                      <SelectItem key={place._id} value={place._id}>
                        {place.data?.displayName?.text || "Unknown Place"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button onClick={() => void handleAddPlace()} className="w-full" disabled={!selectedPlaceId}>
                Add to List
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!list.places || list.places.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No places in this list yet</p>
          <Button onClick={() => setAddPlaceDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Place
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.places.map((place: any) => (
            <Card key={place._id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {place.data?.displayName?.text || "Unknown Place"}
                </CardTitle>
                <CardDescription>
                  {place.data?.formattedAddress || "No address"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {place.data?.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{place.data.rating}</span>
                    </div>
                  )}
                  {place.data?.types && place.data.types.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {place.data.types.slice(0, 3).map((type: string) => (
                        <Badge key={type} variant="outline">
                          {type.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (listId) {
                        void removePlaceFromList({
                          listId: listId as any,
                          placeId: place._id,
                        });
                      }
                    }}
                  >
                    Remove from List
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

