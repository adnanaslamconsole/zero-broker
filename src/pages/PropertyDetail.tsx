import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  Share2,
  MapPin,
  Bed,
  Bath,
  Square,
  Car,
  Building,
  Calendar,
  ShieldCheck,
  Crown,
  Phone,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
  Eye,
  Users,
  TrendingUp,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePropertyBooking } from '@/hooks/usePropertyBooking';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Property } from '@/types/property';

// Transformer function (same as in Properties.tsx)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformProperty = (dbProperty: any): Property => ({
  id: dbProperty.id,
  title: dbProperty.title,
  description: dbProperty.description || '',
  price: dbProperty.price,
  listingType: dbProperty.type === 'sale' ? 'sale' : 'rent',
  propertyType: dbProperty.property_category || 'Apartment',
  bhk: dbProperty.bedrooms || 0,
  bathrooms: dbProperty.bathrooms || 0,
  furnishing: dbProperty.furnishing_status || 'Unfurnished',
  carpetArea: dbProperty.area,
  areaUnit: 'sqft',
  address: dbProperty.address || '',
  locality: dbProperty.locality,
  city: dbProperty.city,
  images: dbProperty.images && dbProperty.images.length > 0 
    ? dbProperty.images 
    : ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'],
  amenities: dbProperty.amenities || [],
  latitude: dbProperty.latitude,
  longitude: dbProperty.longitude,
  isVerified: dbProperty.is_verified || false,
  isPremium: false,
  availableFrom: dbProperty.created_at, // Using created_at as fallback
  postedBy: 'owner', // Default
  ownerId: dbProperty.owner_id,
  ownerTrustScore: dbProperty.profiles?.trust_score || 100,
  ownerKycStatus: dbProperty.profiles?.kyc_status || 'unverified',
  createdAt: dbProperty.created_at,
  updatedAt: dbProperty.updated_at,
  views: 0,
  leads: 0,
  builtUpArea: dbProperty.area, // Fallback
  totalFloors: 0, // Not in DB yet
  floor: 0, // Not in DB yet
  balconies: 0, // Not in DB yet
  parking: 0, // Not in DB yet
  state: 'Karnataka', // Default
  pincode: '560000', // Default
  superBuiltUpArea: dbProperty.area, // Fallback
  pricePerSqft: Math.round(dbProperty.price / dbProperty.area),
  isFeatured: false,
  isActive: true,
});

import { sampleProperties } from '@/data/sampleProperties';
import { BookingDialog } from '@/components/property/BookingDialog';
import { PropertyShare } from '@/components/property/PropertyShare';
import { ChatDrawer } from '@/components/property/ChatDrawer';

// Helper to check if string is valid UUID
const isUUID = (str: string) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
};

export default function PropertyDetail() {
  const { id } = useParams();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user } = useAuth();
  const placeholderImage = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80';

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
      if (!id) return null;
      
      // If it's not a UUID, try to find in sampleProperties first
      if (!isUUID(id)) {
        const sample = sampleProperties.find(p => p.id === id);
        if (sample) return sample;
        // If not in samples and not UUID, it's definitely invalid for Supabase
        return null; 
      }

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return transformProperty(data);
    },
    enabled: Boolean(id),
  });

  const { data: booking } = usePropertyBooking(id);
  const isOwner = user?.profile?.id === property?.ownerId;
  const canChat = isOwner || !!booking;

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getTrustScoreLabel = (score: number) => {
    if (score >= 90) return 'Trusted';
    if (score >= 70) return 'Moderate';
    return 'Risky';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Property Not Found</h1>
          <Button asChild>
            <Link to="/properties">Browse Properties</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(2)} L`;
    } else if (price >= 1000) {
      return `₹${(price / 1000).toFixed(0)}K`;
    }
    return `₹${price.toLocaleString()}`;
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-6">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Link
            to="/properties"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to listings
          </Link>

          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Image Gallery */}
              <div className="relative rounded-2xl overflow-hidden bg-muted">
                <div className="aspect-[4/3] sm:aspect-video relative group">
                  <img
                    src={imgError ? placeholderImage : (property.images[currentImageIndex] || placeholderImage)}
                    alt={property.title}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />

                  {/* Navigation - Hidden on small mobile, shown on hover/sm */}
                  {property.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-all opacity-0 group-hover:opacity-100 hidden sm:flex"
                      >
                        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-all opacity-0 group-hover:opacity-100 hidden sm:flex"
                      >
                        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                    </>
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap gap-2">
                    {property.isPremium && (
                      <Badge variant="premium" className="gap-1 text-[10px] sm:text-xs">
                        <Crown className="w-3 h-3" />
                        Premium
                      </Badge>
                    )}
                    {property.isVerified && (
                      <Badge variant="verified" className="gap-1 text-[10px] sm:text-xs">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex gap-2">
                    <button
                      onClick={() => setIsLiked(!isLiked)}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                    >
                      <Heart
                        className={cn(
                          'w-4 h-4 sm:w-5 sm:h-5',
                          isLiked ? 'fill-destructive text-destructive' : 'text-muted-foreground'
                        )}
                      />
                    </button>
                    <PropertyShare 
                      propertyId={property.id} 
                      title={property.title} 
                      className="w-8 h-8 sm:w-10 sm:h-10 bg-white/90 hover:bg-white shadow-sm border-none"
                    />
                  </div>

                  {/* Image Counter */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/60 text-white text-[10px] sm:text-xs rounded-full backdrop-blur-sm">
                    {currentImageIndex + 1} / {property.images.length}
                  </div>
                </div>

                {/* Thumbnails */}
                {property.images.length > 1 && (
                  <div className="flex gap-2 p-2 overflow-x-auto no-scrollbar bg-card border-t border-border">
                    {property.images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={cn(
                          'w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all',
                          index === currentImageIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                        )}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Property Info */}
              <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant={property.listingType === 'rent' ? 'rent' : 'sale'}>
                        For {property.listingType === 'rent' ? 'Rent' : 'Sale'}
                      </Badge>
                      <Badge variant="secondary" className="bg-secondary/50">
                        {property.propertyType}
                      </Badge>
                    </div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground leading-tight">
                      {property.title}
                    </h1>
                    <p className="flex items-start gap-1.5 text-muted-foreground mt-2 text-sm sm:text-base">
                      <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{property.address}, {property.locality}, {property.city}</span>
                    </p>
                  </div>
                  <div className="sm:text-right flex flex-row sm:flex-col items-baseline sm:items-end gap-2 border-t sm:border-t-0 pt-4 sm:pt-0">
                    <div className="text-2xl sm:text-3xl font-bold text-primary">
                      {formatPrice(property.price)}
                      {property.listingType === 'rent' && (
                        <span className="text-sm sm:text-base font-normal text-muted-foreground ml-1">/mo</span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      ₹{property.pricePerSqft.toLocaleString()}/{property.areaUnit}
                    </p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 py-6 border-y border-border">
                  {property.bhk > 0 && (
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                        <Bed className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground text-sm sm:text-base truncate">{property.bhk} BHK</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Beds</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                      <Bath className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm sm:text-base truncate">{property.bathrooms}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Baths</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                      <Square className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm sm:text-base truncate">
                        {property.carpetArea} <span className="text-xs font-medium">{property.areaUnit}</span>
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Area</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                      <Building className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm sm:text-base truncate capitalize">{property.furnishing}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">Status</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="py-6 border-b border-border">
                  <h2 className="text-lg font-bold text-foreground mb-3">About this property</h2>
                  <p className="text-muted-foreground leading-relaxed text-sm sm:text-base whitespace-pre-line">{property.description}</p>
                </div>

                {/* Details */}
                <div className="py-6 border-b border-border">
                  <h2 className="text-lg font-bold text-foreground mb-4">Detailed Specifications</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 sm:gap-y-4">
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground text-sm">Property Type</span>
                      <span className="font-semibold text-foreground text-sm capitalize">{property.propertyType}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground text-sm">Floor</span>
                      <span className="font-semibold text-foreground text-sm">
                        {property.floor} of {property.totalFloors}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground text-sm">Carpet Area</span>
                      <span className="font-semibold text-foreground text-sm">
                        {property.carpetArea} {property.areaUnit}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground text-sm">Built-up Area</span>
                      <span className="font-semibold text-foreground text-sm">
                        {property.builtUpArea} {property.areaUnit}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground text-sm">Balconies</span>
                      <span className="font-semibold text-foreground text-sm">{property.balconies}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground text-sm">Parking</span>
                      <span className="font-semibold text-foreground text-sm">{property.parking} spots</span>
                    </div>
                    {property.securityDeposit && (
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground text-sm">Security Deposit</span>
                        <span className="font-semibold text-primary text-sm">
                          {formatPrice(property.securityDeposit)}
                        </span>
                      </div>
                    )}
                    {property.maintenanceCharges && (
                      <div className="flex justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground text-sm">Maintenance</span>
                        <span className="font-semibold text-foreground text-sm">
                          ₹{property.maintenanceCharges.toLocaleString()}/mo
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="py-6">
                  <h2 className="text-lg font-bold text-foreground mb-4">Amenities & Features</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {property.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-2.5 text-sm text-foreground bg-secondary/30 px-3 py-2 rounded-lg"
                      >
                        <Check className="w-4 h-4 text-success shrink-0" />
                        <span className="truncate">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Card */}
              <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 sticky top-24 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-black">
                    {property.postedBy === 'owner' ? 'O' : 'A'}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Property Owner</p>
                    <div className="flex flex-col gap-1 mt-1">
                      {property.ownerKycStatus === 'verified' && (
                        <Badge variant="verified" className="w-fit py-0 h-5 text-[10px] gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Owner
                        </Badge>
                      )}
                      {property.ownerTrustScore !== undefined && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "w-fit py-0 h-5 text-[10px] gap-1 font-bold",
                            getTrustScoreColor(property.ownerTrustScore)
                          )}
                        >
                          <TrendingUp className="w-3 h-3" />
                          {property.ownerTrustScore} {getTrustScoreLabel(property.ownerTrustScore)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <Button 
                  variant="accent" 
                  size="lg" 
                  className="w-full gap-2 h-12 rounded-xl font-bold shadow-lg shadow-accent/20"
                  onClick={() => setIsBookingOpen(true)}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Book Verified Visit
                </Button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="secondary" 
                          size="lg" 
                          className={cn(
                            "w-full gap-2 h-12 rounded-xl font-bold transition-all",
                            !canChat ? "opacity-50 grayscale cursor-not-allowed bg-muted" : ""
                          )}
                          onClick={() => {
                            if (!canChat) {
                              toast.info('Chat unlocked after booking', {
                                description: 'Please book a visit slot to initiate chat with the owner.',
                                icon: <Lock className="w-4 h-4" />
                              });
                              return;
                            }
                            setIsChatOpen(true);
                          }}
                        >
                          {canChat ? (
                            <MessageCircle className="w-4 h-4" />
                          ) : (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          )}
                          {canChat ? 'Send Message' : 'Chat Locked'}
                        </Button>
                      </TooltipTrigger>
                      {!canChat && (
                        <TooltipContent side="bottom" className="bg-foreground text-background font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl">
                          Book a visit to unlock chat
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                    Zero Brokerage platform. You'll need to unlock contact details to connect directly.
                  </p>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="font-bold text-foreground mb-5 text-sm uppercase tracking-wider">Listing Insights</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2.5 text-muted-foreground text-sm">
                      <Eye className="w-4 h-4" />
                      Total Views
                    </span>
                    <span className="font-bold text-foreground text-sm">{property.views.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2.5 text-muted-foreground text-sm">
                      <Users className="w-4 h-4" />
                      Inquiries
                    </span>
                    <span className="font-bold text-foreground text-sm">{property.leads.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2.5 text-muted-foreground text-sm">
                      <Calendar className="w-4 h-4" />
                      Available
                    </span>
                    <span className="font-bold text-foreground text-sm">
                      {new Date(property.availableFrom).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2.5 text-muted-foreground text-sm">
                      <Clock className="w-4 h-4" />
                      Posted On
                    </span>
                    <span className="font-bold text-foreground text-sm">
                      {new Date(property.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Zero Brokerage Banner */}
              <div className="bg-gradient-to-br from-success/5 to-success/10 rounded-2xl border border-success/20 p-6 text-center shadow-sm">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success text-success-foreground text-[10px] font-black uppercase tracking-widest mb-4">
                  <ShieldCheck className="w-3 h-3" />
                  Zero Brokerage
                </div>
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  Direct connection with owners. Save up to 1 month's rent in brokerage!
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      {property && (
        <BookingDialog 
          property={property} 
          open={isBookingOpen} 
          onOpenChange={setIsBookingOpen} 
        />
      )}
      {property && booking && (
        <ChatDrawer
          property={property}
          bookingId={booking.id}
          open={isChatOpen}
          onOpenChange={setIsChatOpen}
        />
      )}
    </div>
  );
}
