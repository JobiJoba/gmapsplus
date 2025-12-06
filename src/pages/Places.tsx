import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Trash2 } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";

type Place = {
  _id: any;
  googlePlaceId: string;
  data: any;
  savedAt: number;
  userPlaceId: any;
};

const columnHelper = createColumnHelper<Place>();

export default function Places() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [view, setView] = useState<"table" | "cards">("cards");
  
  const places = useQuery(api.places.searchPlaces, {
    searchQuery: searchQuery || undefined,
    type: typeFilter || undefined,
  });
  const removePlace = useMutation(api.places.removePlace);

  const columns = [
    columnHelper.accessor("data.displayName.text", {
      header: "Name",
      cell: (info) => info.getValue() || "Unknown",
    }),
    columnHelper.accessor("data.formattedAddress", {
      header: "Address",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor("data.rating", {
      header: "Rating",
      cell: (info) => {
        const rating = info.getValue();
        return rating ? (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{rating}</span>
          </div>
        ) : (
          "-"
        );
      },
    }),
    columnHelper.accessor("data.types", {
      header: "Type",
      cell: (info) => {
        const types = info.getValue() || [];
        return types.length > 0 ? (
          <Badge variant="outline">{types[0].replace(/_/g, " ")}</Badge>
        ) : (
          "-"
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <Button
          variant="destructive"
          size="sm"
                    onClick={() => {
                      const place = info.row.original;
                      if (place.userPlaceId) {
                        void removePlace({ userPlaceId: place.userPlaceId });
                      }
                    }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    }),
  ];

  const table = useReactTable({
    data: places || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Get unique types for filter
  const types = Array.from(
    new Set(
      places?.flatMap((p) => p.data?.types || []) || []
    )
  ).slice(0, 10);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Your Places</h1>
        <p className="text-muted-foreground">
          Manage and organize your saved places
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search places..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All types</SelectItem>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* View Toggle */}
      <Tabs value={view} onValueChange={(v) => setView(v as "table" | "cards")}>
        <TabsList>
          <TabsTrigger value="cards">Card View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-6">
          {!places || places.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No places saved yet</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {places.map((place) => (
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
                          <span className="font-semibold">
                            {place.data.rating}
                          </span>
                          {place.data.userRatingCount && (
                            <span className="text-sm text-muted-foreground">
                              ({place.data.userRatingCount})
                            </span>
                          )}
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
                          if (place.userPlaceId) {
                            removePlace({ userPlaceId: place.userPlaceId });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <div className="border rounded-md">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-2 text-left font-semibold"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-muted/50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

