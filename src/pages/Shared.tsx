import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, User } from "lucide-react";
import { Link } from "react-router-dom";

export default function Shared() {
  const sharedLists = useQuery(api.lists.getSharedLists);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Public Lists</h1>
        <p className="text-muted-foreground">
          Discover public lists created by everyone
        </p>
      </div>

      {!sharedLists || sharedLists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No public lists yet. Lists marked as public will appear here.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sharedLists.map((list) => (
            <Card key={list._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{list.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {list.description || "No description"}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{list.ownerName}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {list.placeCount}{" "}
                    {list.placeCount === 1 ? "place" : "places"}
                  </p>
                  <Link to={`/shared/${list._id}`}>
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
