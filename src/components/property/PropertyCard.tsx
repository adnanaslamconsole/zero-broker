import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Heart,
  MapPin,
  Bed,
  Bath,
  Square,
  Car,
  ShieldCheck,
  Crown,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageCircle,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Property } from '@/types/property';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useShortlist } from '@/hooks/useShortlist';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { BookingDialog } from './BookingDialog';

interface PropertyCardProps {
  property: Property;
  variant?: 'default' | 'horizontal';
  radiusKm?: number;
}

export function PropertyCard({ property, variant = 'default', radiusKm }: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const { user } = useAuth();
  const { isShortlisted, toggleShortlist } = useShortlist();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const placeholderImage = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80';

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

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

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

  if (variant === 'horizontal') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border overflow-hidden property-card group transition-all hover:shadow-xl hover:-translate-y-1"
      >
        <Link to={`/property/${property.id}`} className="flex flex-col sm:flex-row h-full">
          {/* Image Section */}
          <div className="relative w-full sm:w-64 md:w-80 h-48 sm:h-auto flex-shrink-0">
            <img
              src={imgError ? placeholderImage : (property.images[currentImageIndex] || placeholderImage)}
              alt={property.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            
            {/* Badges */}
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1.5 sm:gap-2">
              {property.isPremium && (
                <Badge variant="premium" className="gap-1 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1">
                  <Crown className="w-3 h-3" />
                  Premium
                </Badge>
              )}
              {property.isVerified && (
                <Badge variant="verified" className="gap-1 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Owner
                </Badge>
              )}
              {property.ownerTrustScore !== undefined && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "gap-1 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 font-bold",
                    getTrustScoreColor(property.ownerTrustScore)
                  )}
                >
                  <TrendingUp className="w-3 h-3" />
                  {property.ownerTrustScore} {getTrustScoreLabel(property.ownerTrustScore)}
                </Badge>
              )}
              {property.distanceKm !== undefined && (
                <Badge 
                  variant={radiusKm && property.distanceKm <= radiusKm ? 'default' : 'secondary'} 
                  className={cn(
                    "gap-1 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1",
                    radiusKm && property.distanceKm <= radiusKm ? "bg-green-500 hover:bg-green-600" : ""
                  )}
                >
                  <MapPin className="w-3 h-3" />
                  {property.distanceKm.toFixed(1)} km
                </Badge>
              )}
            </div>

            {/* Like Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!user) {
                  toast.error('Please login to shortlist properties');
                  return;
                }
                toggleShortlist(property.id);
              }}
              className="absolute top-2 right-2 sm:top-3 sm:right-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-md active:scale-90"
            >
              <Heart
                className={cn(
                  'w-4.5 h-4.5 sm:w-5 sm:h-5 transition-colors',
                  isShortlisted(property.id) ? 'fill-destructive text-destructive' : 'text-muted-foreground'
                )}
              />
            </button>

            {/* Image Navigation - Hidden on mobile for cleaner look, use dots instead */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/20 backdrop-blur-sm">
              {property.images.slice(0, 5).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-all',
                    index === currentImageIndex ? 'bg-white w-3' : 'bg-white/50'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge variant={property.listingType === 'rent' ? 'rent' : 'sale'} className="text-[10px] sm:text-xs uppercase tracking-wider font-bold">
                  {property.listingType === 'rent' ? 'For Rent' : 'For Sale'}
                </Badge>
                <div className="text-right">
                  <div className="text-lg sm:text-xl font-display font-bold text-primary">
                    {formatPrice(property.price)}
                    {property.listingType === 'rent' && (
                      <span className="text-xs sm:text-sm font-normal text-muted-foreground">/mo</span>
                    )}
                  </div>
                </div>
              </div>
              
              <h3 className="text-base sm:text-lg font-display font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {property.title}
              </h3>
              <p className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {property.locality}, {property.city}
              </p>

              {/* Features Grid */}
              <div className="grid grid-cols-2 xs:grid-cols-4 gap-3 mt-4 text-[10px] sm:text-xs text-muted-foreground">
                {property.bhk > 0 && (
                  <span className="flex items-center gap-1.5 bg-secondary/50 p-1.5 rounded-lg">
                    <Bed className="w-3.5 h-3.5 text-primary" />
                    {property.bhk} BHK
                  </span>
                )}
                <span className="flex items-center gap-1.5 bg-secondary/50 p-1.5 rounded-lg">
                  <Bath className="w-3.5 h-3.5 text-primary" />
                  {property.bathrooms} Bath
                </span>
                <span className="flex items-center gap-1.5 bg-secondary/50 p-1.5 rounded-lg">
                  <Square className="w-3.5 h-3.5 text-primary" />
                  {property.carpetArea} {property.areaUnit}
                </span>
                {property.parking > 0 && (
                  <span className="flex items-center gap-1.5 bg-secondary/50 p-1.5 rounded-lg">
                    <Car className="w-3.5 h-3.5 text-primary" />
                    {property.parking} Park
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3 mt-5 pt-4 border-t border-border">
              <Button 
                  variant="default" 
                  className="flex-1 h-10 sm:h-11 rounded-xl gap-2 font-bold shadow-lg shadow-primary/20"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsBookingOpen(true);
                  }}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Book Verified Visit
                </Button>
              <Button variant="secondary" size="icon" className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl">
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Link>
        <BookingDialog 
          property={property} 
          open={isBookingOpen} 
          onOpenChange={setIsBookingOpen} 
        />
      </motion.div>
    );
  }

  // Default vertical card
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border overflow-hidden property-card group transition-all hover:shadow-xl hover:-translate-y-1 h-full flex flex-col"
    >
      <Link to={`/property/${property.id}`} className="flex flex-col h-full">
        {/* Image Section */}
        <div className="relative h-48 sm:h-52 overflow-hidden">
          <img
            src={imgError ? placeholderImage : (property.images[currentImageIndex] || placeholderImage)}
            alt={property.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap gap-1.5 sm:gap-2">
            {property.isPremium && (
              <Badge variant="premium" className="gap-1 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1">
                <Crown className="w-3 h-3" />
                Premium
              </Badge>
            )}
            {property.isVerified && (
              <Badge variant="verified" className="gap-1 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1">
                <ShieldCheck className="w-3 h-3" />
                Verified Owner
              </Badge>
            )}
            {property.ownerTrustScore !== undefined && (
              <Badge 
                variant="outline" 
                className={cn(
                  "gap-1 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 font-bold",
                  getTrustScoreColor(property.ownerTrustScore)
                )}
              >
                <TrendingUp className="w-3 h-3" />
                {property.ownerTrustScore} {getTrustScoreLabel(property.ownerTrustScore)}
              </Badge>
            )}
            {property.distanceKm !== undefined && (
              <Badge 
                variant={radiusKm && property.distanceKm <= radiusKm ? 'default' : 'secondary'} 
                className={cn(
                  "gap-1 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1",
                  radiusKm && property.distanceKm <= radiusKm ? "bg-green-500 hover:bg-green-600" : ""
                )}
              >
                <MapPin className="w-3 h-3" />
                {property.distanceKm.toFixed(1)} km
              </Badge>
            )}
          </div>

          {/* Like Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!user) {
                toast.error('Please login to shortlist properties');
                return;
              }
              toggleShortlist(property.id);
            }}
            className="absolute top-2 right-2 sm:top-3 sm:right-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all shadow-md active:scale-90"
          >
            <Heart
              className={cn(
                'w-4.5 h-4.5 sm:w-5 sm:h-5 transition-colors',
                isShortlisted(property.id) ? 'fill-destructive text-destructive' : 'text-muted-foreground'
              )}
            />
          </button>

          {/* Image Navigation dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/20 backdrop-blur-sm">
            {property.images.slice(0, 5).map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all',
                  index === currentImageIndex ? 'bg-white w-3' : 'bg-white/50'
                )}
              />
            ))}
          </div>

          {/* Price Tag Overlay for mobile */}
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-primary/95 text-white font-bold text-sm sm:text-base shadow-lg backdrop-blur-sm">
            {formatPrice(property.price)}
            {property.listingType === 'rent' && <span className="text-[10px] font-normal opacity-80">/mo</span>}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={property.listingType === 'rent' ? 'rent' : 'sale'} className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold px-1.5 py-0">
                {property.listingType === 'rent' ? 'For Rent' : 'For Sale'}
              </Badge>
              <span className="text-[10px] sm:text-xs text-muted-foreground">ID: {property.id.slice(0, 8)}</span>
            </div>
            
            <h3 className="text-base sm:text-lg font-display font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-tight">
              {property.title}
            </h3>
            <p className="flex items-center gap-1.5 text-muted-foreground text-[11px] sm:text-sm mt-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary/70" />
              {property.locality}, {property.city}
            </p>

            {/* Features Row */}
            <div className="flex items-center gap-3 mt-4 text-[10px] sm:text-xs text-muted-foreground font-medium">
              {property.bhk > 0 && (
                <span className="flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5 text-primary/70" />
                  {property.bhk}BHK
                </span>
              )}
              <span className="flex items-center gap-1">
                <Bath className="w-3.5 h-3.5 text-primary/70" />
                {property.bathrooms}Bath
              </span>
              <span className="flex items-center gap-1">
                <Square className="w-3.5 h-3.5 text-primary/70" />
                {property.carpetArea}ft²
              </span>
            </div>
          </div>

          {/* Actions - Touch optimized */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            <Button 
              variant="default" 
              className="col-span-3 h-10 sm:h-11 rounded-xl text-[10px] xs:text-xs sm:text-sm font-bold shadow-lg shadow-primary/20 gap-1.5 xs:gap-2 px-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsBookingOpen(true);
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="truncate">Book Verified Visit</span>
            </Button>
            <Button variant="secondary" size="icon" className="h-10 sm:h-11 w-full rounded-xl">
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Link>
      <BookingDialog 
        property={property} 
        open={isBookingOpen} 
        onOpenChange={setIsBookingOpen} 
      />
    </motion.div>
  );
}
