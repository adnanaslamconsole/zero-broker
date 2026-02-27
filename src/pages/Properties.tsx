import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Grid3X3,
  List,
  Map as MapIcon,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react';
import { LocationSearch } from '@/components/property/LocationSearch';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PropertyCard } from '@/components/property/PropertyCard';
import { PropertyMap } from '@/components/property/PropertyMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { saveSearch } from '@/lib/mockApi';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { Property, PropertyFilters, ListingType, PropertyType, FurnishingType } from '@/types/property';

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'independent-house', label: 'Independent House' },
  { value: 'pg', label: 'PG/Hostel' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'plot', label: 'Plot' },
];

const bhkOptions = [1, 2, 3, 4, 5];

const furnishingOptions: { value: FurnishingType; label: string }[] = [
  { value: 'furnished', label: 'Furnished' },
  { value: 'semi-furnished', label: 'Semi-Furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
];

const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
];

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
  state: 'Karnataka', // Default or fetch if available
  pincode: '', // Fetch if available
  latitude: dbProperty.latitude || 0,
  longitude: dbProperty.longitude || 0,
  bhk: dbProperty.bedrooms || 0,
  bathrooms: dbProperty.bathrooms || 0,
  balconies: 0, // Add to DB if needed
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
  isFeatured: false,
  isActive: dbProperty.is_available || true,
  views: 0,
  leads: 0,
  createdAt: dbProperty.created_at,
  updatedAt: dbProperty.updated_at,
});

export default function Properties() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]); // Default Bangalore
  const { user } = useAuth();
  const { toast } = useToast();

  // Filters state
  const [filters, setFilters] = useState<PropertyFilters>({
    listingType: (searchParams.get('type') as ListingType) || undefined,
    propertyType: searchParams.get('property')
      ? [searchParams.get('property') as PropertyType]
      : [],
    bhk: [],
    furnishing: [],
    minPrice: undefined,
    maxPrice: undefined,
  });

  const [sortBy, setSortBy] = useState('relevance');
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['properties', filters, searchQuery, sortBy],
    queryFn: async ({ pageParam = 0 }) => {
      const PAGE_SIZE = 9; // 3x3 grid
      let query = supabase.from('properties').select('*', { count: 'exact' });

      // Apply Filters
      if (filters.listingType) {
        query = query.eq('type', filters.listingType);
      }
      
      if (filters.propertyType && filters.propertyType.length > 0) {
        query = query.in('property_category', filters.propertyType);
      }

      if (filters.bhk && filters.bhk.length > 0) {
        query = query.in('bedrooms', filters.bhk);
      }

      if (filters.furnishing && filters.furnishing.length > 0) {
        query = query.in('furnishing_status', filters.furnishing);
      }

      if (filters.minPrice) {
        query = query.gte('price', filters.minPrice);
      }

      if (filters.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,locality.ilike.%${searchQuery}%`);
      }

      // Apply Sorting
      switch (sortBy) {
        case 'price-low':
          query = query.order('price', { ascending: true });
          break;
        case 'price-high':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      // Pagination
      const from = pageParam;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      
      return {
        properties: data?.map(transformProperty) || [],
        nextPage: (count && to < count - 1) ? to + 1 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '20px',
      threshold: 0,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  const saveSearchMutation = useMutation({
    mutationFn: (query: string) =>
      saveSearch('Saved search', query),
    onSuccess: () => {
      toast({
        title: 'Search saved',
        description: 'You will get alerts when new matching properties are available.',
      });
    },
  });

  // Flatten pages
  const filteredProperties = useMemo(() => {
    return data?.pages.flatMap((page) => page.properties) || [];
  }, [data]);

  const toggleFilter = (key: keyof PropertyFilters, value: string | number) => {
    setFilters((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = prev[key] as any[]; 
      if (!current) return { ...prev, [key]: [value] };
      if (current.includes(value)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { ...prev, [key]: current.filter((v: any) => v !== value) };
      }
      return { ...prev, [key]: [...current, value] };
    });
  };

  const clearFilters = () => {
    setFilters({
      listingType: undefined,
      propertyType: [],
      bhk: [],
      furnishing: [],
      minPrice: undefined,
      maxPrice: undefined,
    });
    setSearchQuery('');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.listingType) count++;
    if (filters.propertyType?.length) count += filters.propertyType.length;
    if (filters.bhk?.length) count += filters.bhk.length;
    if (filters.furnishing?.length) count += filters.furnishing.length;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    return count;
  }, [filters]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-6">
        <div className="container mx-auto px-4">
          {/* Search Bar */}
          <div className="bg-card rounded-xl border border-border p-3 sm:p-4 mb-4 sm:mb-6 relative z-20">
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <LocationSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onLocationSelect={(loc) => {
                    setMapCenter([loc.lat, loc.lon]);
                  }}
                />
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  className="gap-2 h-10 sm:h-11"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden xs:inline">Filters</span>
                  <span className="xs:hidden">Filter</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="default" className="ml-1 px-1.5 min-w-[1.25rem]">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
                
                <div className="bg-background rounded-lg border border-input p-1 flex items-center justify-between sm:justify-start gap-1">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 flex-1 sm:flex-none"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 flex-1 sm:flex-none"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'map' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 flex-1 sm:flex-none"
                    onClick={() => setViewMode('map')}
                  >
                    <MapIcon className="w-4 h-4" />
                  </Button>
                </div>

                <Button className="col-span-2 sm:col-auto gap-2 px-6 h-10 sm:h-11 order-first sm:order-none">
                  <Search className="w-4 h-4" />
                  Search
                </Button>

                <Button
                  variant="outline"
                  className="col-span-2 sm:col-auto h-10 sm:h-11"
                  disabled={!user || saveSearchMutation.isPending}
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (filters.listingType) params.set('type', filters.listingType);
                    if (filters.propertyType?.length) params.set('property', filters.propertyType.join(','));
                    if (searchQuery) params.set('q', searchQuery);
                    saveSearchMutation.mutate(params.toString());
                  }}
                >
                  Save search
                </Button>
              </div>
            </div>

            {/* Listing Type Tabs */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
              {['rent', 'sale'].map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      listingType: prev.listingType === type ? undefined : (type as ListingType),
                    }))
                  }
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                    filters.listingType === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  )}
                >
                  {type === 'rent' ? 'For Rent' : 'For Sale'}
                </button>
              ))}
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card rounded-xl border border-border p-4 sm:p-6 mb-6 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="font-semibold text-foreground">Filters</h3>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Property Type */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">
                    Property Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {propertyTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => toggleFilter('propertyType', type.value)}
                        className={cn(
                          'filter-pill',
                          filters.propertyType?.includes(type.value) && 'active'
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* BHK */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">BHK</label>
                  <div className="flex flex-wrap gap-2">
                    {bhkOptions.map((bhk) => (
                      <button
                        key={bhk}
                        onClick={() => toggleFilter('bhk', bhk)}
                        className={cn(
                          'filter-pill',
                          filters.bhk?.includes(bhk) && 'active'
                        )}
                      >
                        {bhk} BHK
                      </button>
                    ))}
                  </div>
                </div>

                {/* Furnishing */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">
                    Furnishing
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {furnishingOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => toggleFilter('furnishing', option.value)}
                        className={cn(
                          'filter-pill',
                          filters.furnishing?.includes(option.value) && 'active'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">
                    Price Range
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice || ''}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          minPrice: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      className="w-full"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice || ''}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          maxPrice: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Results Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">
                {filteredProperties.length} Properties Found
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filters.listingType === 'rent' ? 'For Rent' : filters.listingType === 'sale' ? 'For Sale' : 'All Properties'}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden xs:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-card border border-border rounded-lg px-2 sm:px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[120px]"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex border border-border rounded-lg overflow-hidden bg-card">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 transition-colors',
                    viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                  )}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 transition-colors',
                    viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                  )}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-xs sm:text-sm text-muted-foreground">Active:</span>
              <div className="flex flex-wrap gap-2">
                {filters.propertyType?.map((type) => (
                  <Badge
                    key={type}
                    variant="secondary"
                    className="gap-1 cursor-pointer py-1"
                    onClick={() => toggleFilter('propertyType', type)}
                  >
                    {propertyTypes.find((t) => t.value === type)?.label}
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
                {filters.bhk?.map((bhk) => (
                  <Badge
                    key={bhk}
                    variant="secondary"
                    className="gap-1 cursor-pointer py-1"
                    onClick={() => toggleFilter('bhk', bhk)}
                  >
                    {bhk} BHK
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
                {filters.furnishing?.map((f) => (
                  <Badge
                    key={f}
                    variant="secondary"
                    className="gap-1 cursor-pointer py-1"
                    onClick={() => toggleFilter('furnishing', f)}
                  >
                    {furnishingOptions.find((opt) => opt.value === f)?.label}
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Property Grid/List */}
          {viewMode === 'map' ? (
            <div className="h-[calc(100vh-300px)] min-h-[400px] sm:h-[600px] rounded-xl overflow-hidden border border-border relative z-0">
              <PropertyMap 
                properties={filteredProperties} 
                center={mapCenter}
              />
            </div>
          ) : filteredProperties.length > 0 ? (
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'responsive-grid'
                  : 'space-y-4'
              )}
            >
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  variant={viewMode === 'list' ? 'horizontal' : 'default'}
                />
              ))}
              
              {/* Infinite Scroll Loader */}
              <div ref={observerTarget} className="col-span-full py-8 flex justify-center w-full">
                {isFetchingNextPage && <Loader2 className="w-8 h-8 animate-spin text-primary" />}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">No properties found</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Try adjusting your filters or search criteria
              </p>
              <Button onClick={clearFilters}>Clear All Filters</Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
