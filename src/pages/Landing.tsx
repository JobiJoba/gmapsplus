import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, List, Share2, Shuffle, Globe, User } from "lucide-react";

export default function Landing() {
  const sharedLists = useQuery(api.lists.getLimitedSharedLists, { limit: 3 });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">GMapsPlus</h1>
          <Link to="/auth">
            <Button className="bg-white text-black hover:bg-gray-200">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold mb-6 text-white">
          Ask more from your Google favorite places
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Save, organize, and discover places from Google Maps like never
          before. Create lists, share with friends, and let the wheel decide
          your next adventure.
        </p>
        <Link to="/auth">
          <Button
            size="lg"
            className="text-lg px-8 bg-white text-black hover:bg-gray-200"
          >
            Get Started
          </Button>
        </Link>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <MapPin className="h-10 w-10 mb-2 text-blue-400" />
              <CardTitle className="text-white">Save Places</CardTitle>
              <CardDescription className="text-gray-300">
                Save your favorite restaurants, cafes, parks, and more from
                Google Maps
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <List className="h-10 w-10 mb-2 text-blue-400" />
              <CardTitle className="text-white">Create Lists</CardTitle>
              <CardDescription className="text-gray-300">
                Save your favorite restaurants, cafes, parks, and more from
                Google Maps
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <Share2 className="h-10 w-10 mb-2 text-blue-400" />
              <CardTitle className="text-white">Share Lists</CardTitle>
              <CardDescription className="text-gray-300">
                Share your curated lists with friends and discover new places
                together
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <Shuffle className="h-10 w-10 mb-2 text-blue-400" />
              <CardTitle className="text-white">Wheel of Places</CardTitle>
              <CardDescription className="text-gray-300">
                Can't decide? Spin the wheel and let fate choose your next
                destination
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Problem Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-4xl font-bold mb-4 text-white">
          Solve the most common problem in Chiang Mai
        </h2>
        <p className="text-2xl text-gray-300 mb-8">
          What to eat Tonight??????!!!???
        </p>
        <div className="max-w-4xl mx-auto">
          <img
            src="/cmProblem.jpg"
            alt="Chiang Mai problem"
            className="w-full rounded-lg shadow-lg"
          />
        </div>
      </section>

      {/* Shared Lists Section */}
      {sharedLists && sharedLists.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold mb-4 text-white">
              Explore Public Lists
            </h2>
            <p className="text-xl text-gray-300">
              Discover curated places from the community
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {sharedLists.map((list) => (
              <Card key={list._id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-white">
                        {list.name}
                      </CardTitle>
                      <CardDescription className="mt-1 text-gray-300">
                        {list.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-blue-500/20 text-blue-300"
                    >
                      <Globe className="h-3 w-3 mr-1" />
                      Public
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <User className="h-4 w-4" />
                      <span>{list.ownerName}</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      {list.placeCount}{" "}
                      {list.placeCount === 1 ? "place" : "places"}
                    </p>
                    <Link to={`/shared/${list._id}`}>
                      <Button
                        variant="outline"
                        className="w-full border-gray-700 bg-gray-800 text-white hover:bg-gray-700 hover:text-white"
                      >
                        View List
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20 bg-black">
        <div className="container mx-auto px-4 py-8 text-center text-gray-400">
          <p>© 2024 GMapsPlus. Built with Google Maps.</p>
        </div>
      </footer>
    </div>
  );
}
