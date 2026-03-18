import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Property, ListingType, PropertyType, FurnishingType } from '@/types/property';

// Transformer function to map DB columns to frontend Property type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformProperty = (dbProperty: any): Property => ({
  id: dbProperty.id,
  title: dbProperty.title,
  description: dbProperty.description || '',
  listingType: dbProperty.type as ListingType,
  propertyType: dbProperty.property_category as PropertyType,
  address: dbProperty.address || '',
  locality: dbProperty.locality,
  city: dbProperty.city,
  state: 'Karnataka', 
  pincode: '', 
  latitude: dbProperty.latitude || 0,
  longitude: dbProperty.longitude || 0,
  bhk: dbProperty.bedrooms || 0,
  bathrooms: dbProperty.bathrooms || 0,
  balconies: 0, 
  furnishing: (dbProperty.furnishing_status as FurnishingType) || 'unfurnished',
  floor: 0,
  totalFloors: 0,
  carpetArea: dbProperty.area || 0,
  builtUpArea: dbProperty.area || 0,
  superBuiltUpArea: dbProperty.area || 0,
  areaUnit: 'sqft',
  price: dbProperty.price,
  pricePerSqft: Math.round(dbProperty.price / (dbProperty.area || 1)),
  securityDeposit: 0,
  maintenanceCharges: 0,
  parking: 0,
  amenities: dbProperty.amenities || [],
  images: dbProperty.images || [],
  availableFrom: new Date().toISOString(),
  postedBy: 'owner',
  ownerId: dbProperty.owner_id,
  isVerified: dbProperty.is_verified || false,
  isPremium: false,
  isFeatured: true,
  isActive: dbProperty.is_available || true,
  views: 0,
  leads: 0,
  createdAt: dbProperty.created_at,
  updatedAt: dbProperty.updated_at,
});

export function FeaturedProperties() {
  const { data: featuredProperties, isLoading } = useQuery({
    queryKey: ['featured-properties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_available', true)
        .limit(6);
      
      if (error) throw error;
      return data.map(transformProperty);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="mobile-optimized-spacing">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 sm:mb-12">
          <div className="space-y-1">
            <h2 className="text-foreground">
              Featured Properties
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Hand-picked properties by our team
            </p>
          </div>
          <Button variant="outline" asChild className="w-full sm:w-auto gap-2 touch-friendly rounded-xl">
            <Link to="/properties">
              View All Properties
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Property Grid */}
        <div className="responsive-grid">
          {featuredProperties?.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <PropertyCard property={property} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
