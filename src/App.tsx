import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import Index from "./pages/Index";
import RecipeDetail from "./pages/RecipeDetail";
import FavoritesPage from "./pages/FavoritesPage";
import ShoppingListPage from "./pages/ShoppingListPage";
import MealPlanPage from "./pages/MealPlanPage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Protected routes with Navbar */}
            <Route path="/cookbook" element={<ProtectedRoute><><Navbar /><Index /></></ProtectedRoute>} />
            <Route path="/recipe/:id" element={<ProtectedRoute><><Navbar /><RecipeDetail /></></ProtectedRoute>} />
            <Route path="/meal-plan" element={<ProtectedRoute><><Navbar /><MealPlanPage /></></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><><Navbar /><FavoritesPage /></></ProtectedRoute>} />
            <Route path="/shopping-list" element={<ProtectedRoute><><Navbar /><ShoppingListPage /></></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
