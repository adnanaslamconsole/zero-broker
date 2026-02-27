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
} from 'lucide-react';
import { Property } from '@/types/property';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PropertyCardProps {
  property: Property;
  variant?: 'default' | 'horizontal';
}

export function PropertyCard({ property, variant = 'default' }: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

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

  if (variant === 'horizontal') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border overflow-hidden property-card group"
      >
        <Link to={`/property/${property.id}`} className="flex flex-col md:flex-row">
          {/* Image Section */}
          <div className="relative w-full md:w-80 h-56 md:h-auto flex-shrink-0">
            <img
              src={property.images[currentImageIndex]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
            
            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              {property.isPremium && (
                <Badge variant="premium" className="gap-1">
                  <Crown className="w-3 h-3" />
                  Premium
                </Badge>
              )}
              {property.isVerified && (
                <Badge variant="verified" className="gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </Badge>
              )}
            </div>

            {/* Like Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsLiked(!isLiked);
              }}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
            >
              <Heart
                className={cn(
                  'w-5 h-5 transition-colors',
                  isLiked ? 'fill-destructive text-destructive' : 'text-muted-foreground'
                )}
              />
            </button>

            {/* Image Navigation */}
            {property.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {property.images.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full transition-colors',
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Content Section */}
          <div className="flex-1 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Badge variant={property.listingType === 'rent' ? 'rent' : 'sale'} className="mb-2">
                  For {property.listingType === 'rent' ? 'Rent' : 'Sale'}
                </Badge>
                <h3 className="text-lg font-semibold text-foreground line-clamp-1 group-hover:text-accent transition-colors">
                  {property.title}
                </h3>
                <p className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
                  <MapPin className="w-4 h-4" />
                  {property.locality}, {property.city}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-foreground">
                  {formatPrice(property.price)}
                  {property.listingType === 'rent' && (
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  )}
                </div>
                {property.listingType === 'rent' && property.securityDeposit && (
                  <div className="text-xs text-muted-foreground">
                    Deposit: {formatPrice(property.securityDeposit)}
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              {property.bhk > 0 && (
                <span className="flex items-center gap-1.5">
                  <Bed className="w-4 h-4" />
                  {property.bhk} BHK
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Bath className="w-4 h-4" />
                {property.bathrooms} Bath
              </span>
              <span className="flex items-center gap-1.5">
                <Square className="w-4 h-4" />
                {property.carpetArea} {property.areaUnit}
              </span>
              {property.parking > 0 && (
                <span className="flex items-center gap-1.5">
                  <Car className="w-4 h-4" />
                  {property.parking} Parking
                </span>
              )}
            </div>

            {/* Amenities */}
            <div className="flex flex-wrap gap-2 mt-4">
              {property.amenities.slice(0, 4).map((amenity) => (
                <span
                  key={amenity}
                  className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md"
                >
                  {amenity}
                </span>
              ))}
              {property.amenities.length > 4 && (
                <span className="px-2 py-1 text-xs text-muted-foreground">
                  +{property.amenities.length - 4} more
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
              <Button variant="accent" className="flex-1 gap-2">
                <Phone className="w-4 h-4" />
                Contact Owner
              </Button>
              <Button variant="outline" size="icon">
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // Default vertical card
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border overflow-hidden property-card group"
    >
      <Link to={`/property/${property.id}`}>
        {/* Image Section */}
        <div className="relative h-52">
          <img
            src={property.images[currentImageIndex]}
            alt={property.title}
            className="w-full h-full object-cover"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {property.isPremium && (
              <Badge variant="premium" className="gap-1">
                <Crown className="w-3 h-3" />
                Premium
              </Badge>
            )}
            {property.isVerified && (
              <Badge variant="verified" className="gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </Badge>
            )}
          </div>

          {/* Like Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsLiked(!isLiked);
            }}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
          >
            <Heart
              className={cn(
                'w-5 h-5 transition-colors',
                isLiked ? 'fill-destructive text-destructive' : 'text-muted-foreground'
              )}
            />
          </button>

          {/* Image Navigation */}
          {property.images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {property.images.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-colors',
                      index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    )}
                  />
                ))}
              </div>
            </>
          )}

          {/* Price Tag */}
          <div className="absolute bottom-3 left-3 price-tag">
            {formatPrice(property.price)}
            {property.listingType === 'rent' && <span className="text-xs opacity-75">/mo</span>}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <Badge variant={property.listingType === 'rent' ? 'rent' : 'sale'} className="mb-2">
            For {property.listingType === 'rent' ? 'Rent' : 'Sale'}
          </Badge>
          <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-accent transition-colors">
            {property.title}
          </h3>
          <p className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
            <MapPin className="w-3.5 h-3.5" />
            {property.locality}, {property.city}
          </p>

          {/* Features */}
          <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
            {property.bhk > 0 && (
              <span className="flex items-center gap-1">
                <Bed className="w-3.5 h-3.5" />
                {property.bhk}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Bath className="w-3.5 h-3.5" />
              {property.bathrooms}
            </span>
            <span className="flex items-center gap-1">
              <Square className="w-3.5 h-3.5" />
              {property.carpetArea}
            </span>
          </div>

          {/* CTA */}
          <Button variant="outline" size="sm" className="w-full mt-4 gap-2">
            <Phone className="w-4 h-4" />
            Contact Owner
          </Button>
        </div>
      </Link>
    </motion.div>
  );
}
