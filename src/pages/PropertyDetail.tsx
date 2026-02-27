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
} from 'lucide-react';
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
  createdAt: dbProperty.created_at,
  updatedAt: dbProperty.updated_at,
  views: 0,
  leads: 0,
  ownerId: dbProperty.owner_id,
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

export default function PropertyDetail() {
  const { id } = useParams();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: async () => {
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

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Image Gallery */}
              <div className="relative rounded-2xl overflow-hidden">
                <div className="aspect-video relative">
                  <img
                    src={property.images[currentImageIndex]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Navigation */}
                  {property.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </>
                  )}

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
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

                  {/* Actions */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() => setIsLiked(!isLiked)}
                      className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                    >
                      <Heart
                        className={cn(
                          'w-5 h-5',
                          isLiked ? 'fill-destructive text-destructive' : 'text-muted-foreground'
                        )}
                      />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors">
                      <Share2 className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Image Counter */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 text-white text-sm rounded-full">
                    {currentImageIndex + 1} / {property.images.length}
                  </div>
                </div>

                {/* Thumbnails */}
                {property.images.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                    {property.images.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={cn(
                          'w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors',
                          index === currentImageIndex ? 'border-accent' : 'border-transparent'
                        )}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Property Info */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <Badge variant={property.listingType === 'rent' ? 'rent' : 'sale'}>
                      For {property.listingType === 'rent' ? 'Rent' : 'Sale'}
                    </Badge>
                    <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-2">
                      {property.title}
                    </h1>
                    <p className="flex items-center gap-1.5 text-muted-foreground mt-2">
                      <MapPin className="w-4 h-4" />
                      {property.address}, {property.locality}, {property.city}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-foreground">
                      {formatPrice(property.price)}
                      {property.listingType === 'rent' && (
                        <span className="text-base font-normal text-muted-foreground">/month</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ₹{property.pricePerSqft}/{property.areaUnit}
                    </p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-y border-border">
                  {property.bhk > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Bed className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{property.bhk} BHK</p>
                        <p className="text-xs text-muted-foreground">Bedrooms</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Bath className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{property.bathrooms}</p>
                      <p className="text-xs text-muted-foreground">Bathrooms</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Square className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {property.carpetArea} {property.areaUnit}
                      </p>
                      <p className="text-xs text-muted-foreground">Carpet Area</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <Building className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground capitalize">{property.furnishing}</p>
                      <p className="text-xs text-muted-foreground">Furnishing</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="py-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground mb-3">Description</h2>
                  <p className="text-muted-foreground leading-relaxed">{property.description}</p>
                </div>

                {/* Details */}
                <div className="py-6 border-b border-border">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Property Details</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Property Type</span>
                      <span className="font-medium text-foreground capitalize">{property.propertyType}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Floor</span>
                      <span className="font-medium text-foreground">
                        {property.floor} of {property.totalFloors}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Carpet Area</span>
                      <span className="font-medium text-foreground">
                        {property.carpetArea} {property.areaUnit}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Built-up Area</span>
                      <span className="font-medium text-foreground">
                        {property.builtUpArea} {property.areaUnit}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Balconies</span>
                      <span className="font-medium text-foreground">{property.balconies}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Parking</span>
                      <span className="font-medium text-foreground">{property.parking} spots</span>
                    </div>
                    {property.securityDeposit && (
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Security Deposit</span>
                        <span className="font-medium text-foreground">
                          {formatPrice(property.securityDeposit)}
                        </span>
                      </div>
                    )}
                    {property.maintenanceCharges && (
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Maintenance</span>
                        <span className="font-medium text-foreground">
                          ₹{property.maintenanceCharges.toLocaleString()}/month
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="py-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Amenities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {property.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-2 text-sm text-foreground"
                      >
                        <Check className="w-4 h-4 text-success" />
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="py-6 border-t border-border">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Location</h2>
                  <div className="aspect-video rounded-xl overflow-hidden border border-border">
                    <iframe
                      title="Map"
                      width="100%"
                      height="100%"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${property.latitude},${property.longitude}&output=embed`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Card */}
              <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                    O
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Property Owner</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="w-4 h-4 text-success" />
                      Verified Owner
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <Button variant="accent" size="lg" className="w-full gap-2">
                    <Phone className="w-4 h-4" />
                    Contact Owner
                  </Button>
                  <Button variant="outline" size="lg" className="w-full gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Send Message
                  </Button>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    You'll need to unlock contacts to view owner details
                  </p>
                </div>
              </div>

              {/* Stats Card */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Listing Statistics</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Eye className="w-4 h-4" />
                      Views
                    </span>
                    <span className="font-semibold text-foreground">{property.views}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      Leads
                    </span>
                    <span className="font-semibold text-foreground">{property.leads}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Available From
                    </span>
                    <span className="font-semibold text-foreground">
                      {new Date(property.availableFrom).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Posted
                    </span>
                    <span className="font-semibold text-foreground">
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
              <div className="bg-success/10 rounded-xl border border-success/20 p-6 text-center">
                <Badge variant="zeroBrokerage" className="mb-3">
                  Zero Brokerage
                </Badge>
                <p className="text-sm text-foreground">
                  Connect directly with the owner and save on brokerage fees!
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
