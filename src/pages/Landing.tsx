import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, List, Share2, Shuffle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GMapsPlus</h1>
          <Link to="/auth">
            <Button className="bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold mb-6 text-gray-900 dark:text-white">
          Ask more from your Google favorite places
        </h2>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Save, organize, and discover places from Google Maps like never before.
          Create lists, share with friends, and let the wheel decide your next adventure.
        </p>
        <Link to="/auth">
          <Button size="lg" className="text-lg px-8 bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
            Get Started
          </Button>
        </Link>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <MapPin className="h-10 w-10 mb-2 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-gray-900 dark:text-white">Save Places</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Save your favorite restaurants, cafes, parks, and more from Google Maps
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <List className="h-10 w-10 mb-2 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-gray-900 dark:text-white">Create Lists</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Organize places into custom lists - private or public, share with anyone
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <Share2 className="h-10 w-10 mb-2 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-gray-900 dark:text-white">Share Lists</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Share your curated lists with friends and discover new places together
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <Shuffle className="h-10 w-10 mb-2 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-gray-900 dark:text-white">Wheel of Places</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Can't decide? Spin the wheel and let fate choose your next destination
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600 dark:text-gray-400">
          <p>© 2024 GMapsPlus. Built with Google Maps.</p>
        </div>
      </footer>
    </div>
  );
}

