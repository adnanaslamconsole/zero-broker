import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";
import { LocationProvider } from "./context/LocationContext";
import Login from "./pages/Login";
import PostProperty from "./pages/PostProperty";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import Society from "./pages/Society";
import OwnerDashboard from "./pages/OwnerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Payments from "./pages/Payments";
import Agreements from "./pages/Agreements";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Plans from "./pages/Plans";
import HelpCenter from "./pages/HelpCenter";
import ContactUs from "./pages/ContactUs";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AboutUs from "./pages/AboutUs";
import Careers from "./pages/Careers";
import Blog from "./pages/Blog";
import Press from "./pages/Press";
import { MobileNav } from "./components/layout/MobileNav";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import { ScrollToTopOnNavigate } from "./components/layout/ScrollToTopOnNavigate";
import { queryClient } from "@/lib/queryClient";
import { AuthLoadingOverlay } from "@/components/auth/AuthLoadingOverlay";
import { MobileLocationBootstrap } from "@/components/location/MobileLocationBootstrap";
import SocialProof from "@/components/common/SocialProof";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <LocationProvider>
            <BrowserRouter>
            <ScrollToTopOnNavigate />
            <div className="flex flex-col min-h-screen pb-16 lg:pb-0">
              <AuthLoadingOverlay />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/properties" element={<Properties />} />
                <Route path="/property/:id" element={<PropertyDetail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/post-property" element={<PostProperty />} />
                <Route path="/services" element={<Services />} />
                <Route path="/services/:id" element={<ServiceDetail />} />
                <Route path="/society" element={<Society />} />
                <Route path="/owner/dashboard" element={<OwnerDashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/agreements" element={<Agreements />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/help-center" element={<HelpCenter />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/press" element={<Press />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <MobileNav />
            <ScrollToTop />
            <SocialProof />
          </div>
            </BrowserRouter>
          </LocationProvider>
        </AuthProvider>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
