import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Authenticated, Unauthenticated } from "convex/react";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Nav from "./components/Nav";
import MapPage from "./pages/MapPage";
import Places from "./pages/Places";
import Lists from "./pages/Lists";
import ListDetails from "./pages/ListDetails";
import Wheel from "./pages/Wheel";
import Shared from "./pages/Shared";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <Authenticated>
      {children}
      <Unauthenticated>
        <Navigate to="/auth" replace />
      </Unauthenticated>
    </Authenticated>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Unauthenticated>
              <Landing />
            </Unauthenticated>
          }
        />
        <Route
          path="/auth"
          element={
            <Unauthenticated>
              <Auth />
            </Unauthenticated>
          }
        />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout>
                <MapPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/places"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Places />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/lists"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Lists />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/lists/:listId"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ListDetails />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/wheel"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Wheel />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/shared"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Shared />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
