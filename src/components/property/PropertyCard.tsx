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
  Trash2,
} from 'lucide-react';
import { Property } from '@/types/property';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useShortlist } from '@/hooks/useShortlist';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { BookingDialog } from './BookingDialog';
import { PropertyShare } from './PropertyShare';
import { usePropertyBooking } from '@/hooks/usePropertyBooking';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';
import { ChatDrawer } from './ChatDrawer';

interface PropertyCardProps {
  property: Property;
  variant?: 'default' | 'horizontal';
  radiusKm?: number;
  onDelete?: (id: string, e: React.MouseEvent) => void;
}

export function PropertyCard({ property, variant = 'default', radiusKm, onDelete }: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const { user } = useAuth();
  const { isShortlisted, toggleShortlist } = useShortlist();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { data: booking } = usePropertyBooking(property.id);
  const isOwner = user?.profile?.id === property.ownerId;
  const canChat = isOwner || !!booking;
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
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-background rounded-[2rem] border border-border/40 overflow-hidden group transition-all duration-700 hover:shadow-[0_45px_100px_-20px_rgba(0,0,0,0.12)] hover:border-primary/20 relative h-full flex flex-col md:flex-row shadow-[0_15px_40px_-15px_rgba(0,0,0,0.05)]"
      >
        <Link to={`/property/${property.id}`} className="flex flex-col md:flex-row h-full w-full">
          {/* Enhanced Image Section */}
          <div className="relative w-full md:w-[380px] lg:w-[440px] h-[280px] md:h-auto overflow-hidden shrink-0">
            <img
              src={imgError ? placeholderImage : (property.images[currentImageIndex] || placeholderImage)}
              alt={property.title}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            />
            
            {/* Soft Gradient for Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 opacity-60" />
            
            {/* Premium Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <Badge className={cn(
                "px-5 py-2 rounded-2xl font-black uppercase tracking-[0.12em] text-[10px] border-none shadow-2xl backdrop-blur-xl ring-1 ring-white/20",
                property.listingType === 'rent' 
                  ? "bg-blue-600/90 text-white" 
                  : "bg-white text-[#cc6600]"
              )}>
                FOR {property.listingType}
              </Badge>
              {property.isVerified && (
                <Badge className="bg-emerald-500/90 text-white px-5 py-2 rounded-2xl font-black uppercase tracking-[0.12em] text-[10px] border-none shadow-2xl backdrop-blur-xl ring-1 ring-white/20 gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified
                </Badge>
              )}
            </div>

            {/* Like & Share Icons */}
            <div className="absolute top-4 right-4 flex flex-col gap-3">
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
                className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-white text-white hover:text-destructive transition-all shadow-2xl border border-white/20 active:scale-90"
              >
                <Heart
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isShortlisted(property.id) ? 'fill-destructive text-destructive' : 'current-color'
                  )}
                />
              </button>
              <PropertyShare 
                propertyId={property.id} 
                title={property.title} 
                className="w-11 h-11 bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-full text-white hover:bg-white hover:text-primary transition-all"
              />
            </div>

            {/* Price Highlight - Horizontal Specific */}
            <div className="absolute bottom-6 left-6 animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="bg-[#ff4d1c] text-white px-6 py-3 rounded-2xl shadow-2xl shadow-orange-500/30 flex items-center justify-center font-display border border-white/10">
                <span className="text-2xl font-black tracking-tighter">{formatPrice(property.price)}</span>
                {property.listingType === 'rent' && <span className="text-[10px] font-bold opacity-70 ml-1.5 uppercase tracking-widest mt-1">/mo</span>}
              </div>
            </div>

            {/* Image Pagination dots - Larger touch targets for mobile */}
            <div className="absolute bottom-6 right-6 flex gap-2.5 sm:gap-2">
              {property.images.slice(0, 4).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'h-2 sm:h-1.5 rounded-full transition-all duration-500 touch-target',
                    index === currentImageIndex ? 'bg-white w-8 sm:w-6 shadow-[0_0_10px_white]' : 'bg-white/40 w-2 sm:w-1.5'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Premium Content Section */}
          <div className="flex-1 p-8 md:p-10 lg:p-12 flex flex-col justify-between overflow-hidden">
            <div className="relative">
              {property.isPremium && (
                <div className="flex items-center gap-2 mb-6 animate-in fade-in duration-1000">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-600/80">Premium Collection</span>
                </div>
              )}
              
              <h3 className="text-2xl sm:text-3xl font-black text-foreground leading-[1.1] mb-4 tracking-tight group-hover:text-primary transition-colors line-clamp-2">
                {property.title}
              </h3>
              
              <div className="flex items-center gap-2 text-muted-foreground/70 mb-8 font-semibold tracking-tight">
                <MapPin className="w-4.5 h-4.5 text-primary/40 shrink-0" />
                <span className="truncate">{property.locality}, {property.city}</span>
              </div>

              {/* Ultra-Modern Features Layout */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {property.bhk > 0 && (
                  <div className="flex items-center gap-4 group/item">
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center group-hover/item:bg-primary/10 transition-colors">
                      <Bed className="w-5 h-5 text-primary/70" />
                    </div>
                    <div className="flex flex-col -space-y-1">
                      <span className="text-lg font-black">{property.bhk}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Bedrooms</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4 group/item">
                  <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center group-hover/item:bg-primary/10 transition-colors">
                    <Square className="w-5 h-5 text-primary/70" />
                  </div>
                  <div className="flex flex-col -space-y-1">
                    <span className="text-lg font-black">{property.carpetArea}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">SQ. FT.</span>
                  </div>
                </div>
                <div className="hidden lg:flex items-center gap-4 group/item">
                  <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center group-hover/item:bg-primary/10 transition-colors">
                    <Bath className="w-5 h-5 text-primary/70" />
                  </div>
                  <div className="flex flex-col -space-y-1">
                    <span className="text-lg font-black">{property.bathrooms}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Bathrooms</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action Row */}
            <div className="flex items-center gap-4 mt-auto pt-8 border-t border-border/40">
              <Button 
                variant="default" 
                className="flex-1 h-14 sm:h-16 bg-[#ff4d1c] hover:bg-[#e64619] text-white rounded-[1.25rem] sm:rounded-[1.5rem] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] text-[10px] sm:text-[11px] gap-2 sm:gap-3 shadow-2xl shadow-orange-500/20 active:scale-95 transition-all group/btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsBookingOpen(true);
                }}
              >
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 group-hover/btn:scale-110 transition-transform" />
                BOOK VERIFIED VISIT
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="shrink-0">
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className={cn(
                          "h-14 w-14 sm:h-16 sm:w-16 rounded-[1.25rem] sm:rounded-[1.5rem] transition-all relative overflow-hidden",
                          !canChat ? "opacity-50 grayscale cursor-not-allowed bg-muted" : "hover:bg-secondary hover:text-primary"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
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
                          <MessageCircle className="w-6 h-6" />
                        ) : (
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {!canChat && (
                    <TooltipContent side="top" className="bg-foreground text-background font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl">
                      Book slot to chat
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
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
      className="bg-card rounded-2xl border border-border/50 overflow-hidden property-card group transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1.5 h-full flex flex-col relative"
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
            {property.bountyReward && property.bountyVerificationStatus === 'pending' && (
              <Badge variant="outline" className="gap-1 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-50 text-amber-600 border-amber-200 font-black animate-pulse">
                <TrendingUp className="w-3 h-3" />
                ₹{property.bountyReward}
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

          <PropertyShare 
            propertyId={property.id} 
            title={property.title} 
            className="absolute top-2 right-12 sm:top-3 sm:right-14 w-8 h-8 sm:w-10 sm:h-10 bg-white/90 backdrop-blur-sm border-none shadow-md"
          />
 
          {/* Delete Button (Owner Only) */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(property.id, e);
              }}
              className="absolute top-2 right-22 sm:top-3 sm:right-24 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-destructive/10 backdrop-blur-sm flex items-center justify-center hover:bg-destructive hover:text-white text-destructive transition-all shadow-md active:scale-90"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
 
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className={cn(
                      "h-10 sm:h-11 w-full rounded-xl transition-all relative",
                      !canChat ? "opacity-50 grayscale cursor-not-allowed" : ""
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!canChat) {
                        toast.info('Chat unlocked after booking', {
                          description: 'Book a visit to chat',
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
                  </Button>
                </TooltipTrigger>
                {!canChat && (
                  <TooltipContent side="top" className="bg-foreground text-background font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg">
                    Book to chat
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </Link>
      <BookingDialog 
        property={property} 
        open={isBookingOpen} 
        onOpenChange={setIsBookingOpen} 
      />
      {booking && (
        <ChatDrawer
          property={property}
          bookingId={booking.id}
          open={isChatOpen}
          onOpenChange={setIsChatOpen}
        />
      )}
    </motion.div>
  );
}
