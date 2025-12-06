import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Plus } from "lucide-react";
import { Link } from "react-router-dom";

export default function Shared() {
  const sharedLists = useQuery(api.lists.getSharedLists);
  const userPlaces = useQuery(api.places.getUserPlaces);
  const savePlace = useMutation(api.places.savePlace);

  const handleSavePlace = async (googlePlaceId: string) => {
    try {
      // Places in shared lists already exist in the database,
      // so we can save without fetching data
      await savePlace({ googlePlaceId });
    } catch (error) {
      console.error("Error saving place:", error);
      alert("Error saving place: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Shared Lists</h1>
        <p className="text-muted-foreground">
          Lists shared with you by other users
        </p>
      </div>

      {!sharedLists || sharedLists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No shared lists yet. Share links will appear here when others share lists with you.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sharedLists.map((list) => (
            <Card key={list._id}>
              <CardHeader>
                <CardTitle className="text-lg">{list.name}</CardTitle>
                <CardDescription>
                  {list.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {list.placeCount} {list.placeCount === 1 ? "place" : "places"}
                  </p>
                  <Link to={`/app/lists/${list._id}`}>
                    <Button variant="outline" className="w-full">
                      View List
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

