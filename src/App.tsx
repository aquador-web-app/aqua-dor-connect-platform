import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import About from "./pages/About";
import Instructors from "./pages/Instructors";
import Courses from "./pages/Courses";
import Gallery from "./pages/Gallery";
import Store from "./pages/Store";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import StudentPortal from "./pages/StudentPortal";
import CoachPortal from "./pages/CoachPortal";
import AdminPortal from "./pages/AdminPortal";
import AdminLogin from "./pages/AdminLogin";
import CoachLogin from "./pages/CoachLogin";
import ParentPortal from "./pages/ParentPortal";
import InfluencerPortal from "./pages/InfluencerPortal";
import CompleteProfile from "./pages/CompleteProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<About />} />
                <Route path="/instructors" element={<Instructors />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/store" element={<Store />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/coach-login" element={<CoachLogin />} />
                <Route path="/complete-profile" element={<CompleteProfile />} />
                <Route 
                  path="/student-portal" 
                  element={
                    <ProtectedRoute allowedRoles={["student", "parent"]}>
                      <StudentPortal />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/coach-portal" 
                  element={
                    <ProtectedRoute allowedRoles={["instructor", "admin", "co_admin"]}>
                      <CoachPortal />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin-portal" 
                  element={
                    <ProtectedRoute allowedRoles={["admin", "co_admin"]}>
                      <AdminPortal />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/parent-portal" 
                  element={
                    <ProtectedRoute allowedRoles={["parent"]}>
                      <ParentPortal />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/influencer-portal" 
                  element={
                    <ProtectedRoute allowedRoles={["influencer"]}>
                      <InfluencerPortal />
                    </ProtectedRoute>
                  } 
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
