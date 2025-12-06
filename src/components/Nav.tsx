import { Link, useLocation } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, List, Shuffle, Share2, LogOut } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Nav() {
  const location = useLocation();
  const { signOut } = useAuthActions();
  const user = useQuery(api.myFunctions.listNumbers, { count: 0 });

  const navItems = [
    { path: "/app", label: "Add a place", icon: MapPin },
    { path: "/app/places", label: "Your places", icon: MapPin },
    { path: "/app/lists", label: "Your lists", icon: List },
    { path: "/app/wheel", label: "Wheel of places", icon: Shuffle },
    { path: "/app/shared", label: "Shared lists", icon: Share2 },
  ];

  return (
    <header className="border-b border-gray-800 sticky top-0 z-50 bg-black text-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/app" className="text-xl font-bold text-white">
              GMapsPlus
            </Link>
            <nav className="hidden md:flex gap-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? "bg-white text-black"
                        : "text-gray-300 hover:text-white hover:bg-gray-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                  <Avatar>
                    <AvatarFallback>
                      {user?.viewer ? user.viewer.charAt(0).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm text-white">
                    {user?.viewer || "User"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => void signOut()}
                  className="cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
