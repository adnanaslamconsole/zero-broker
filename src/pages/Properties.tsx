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
import { useGeolocation } from '@/hooks/useGeolocation';
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
  distanceKm: dbProperty.distance_km || undefined,
  createdAt: dbProperty.created_at,
  updatedAt: dbProperty.updated_at,
});

export default function Properties() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]); // Default Bangalore
  const [mapBounds, setMapBounds] = useState<{ ne: [number, number]; sw: [number, number] } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const { coords: userCoords, loading: locationLoading, error: locationError } = useGeolocation();
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

  // Sync URL search params with filters state
  useEffect(() => {
    const type = searchParams.get('type') as ListingType;
    const property = searchParams.get('property') as PropertyType;
    const q = searchParams.get('q');

    setFilters(prev => {
      // Only update if they are actually different to avoid unnecessary re-renders
      if (
        prev.listingType === (type || undefined) &&
        (prev.propertyType?.[0] || undefined) === (property || undefined) &&
        searchQuery === (q || '')
      ) {
        return prev;
      }

      return {
        ...prev,
        listingType: type || undefined,
        propertyType: property ? [property] : [],
      };
    });

    if (q !== null && q !== searchQuery) {
      setSearchQuery(q);
    } else if (q === null && searchQuery !== '') {
      setSearchQuery('');
    }
  }, [searchParams]);

  const [sortBy, setSortBy] = useState('relevance');
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['properties', filters, searchQuery, sortBy, userCoords, radiusKm, mapBounds, viewMode],
    queryFn: async ({ pageParam = 0 }) => {
      const PAGE_SIZE = viewMode === 'map' ? 100 : 9;
      const offset = typeof pageParam === 'number' ? pageParam : 0;
      
      // Map view synchronization: If bounds are present and we're in map mode, filter by bounds
      if (viewMode === 'map' && mapBounds) {
        let query = supabase.from('properties').select('*', { count: 'exact' });
        
        query = query
          .gte('latitude', mapBounds.sw[0])
          .lte('latitude', mapBounds.ne[0])
          .gte('longitude', mapBounds.sw[1])
          .lte('longitude', mapBounds.ne[1]);

        if (filters.listingType) query = query.eq('type', filters.listingType);
        if (filters.propertyType?.length) query = query.in('property_category', filters.propertyType);
        
        const { data: boundData, count: boundCount, error: boundError } = await query
          .range(offset, offset + PAGE_SIZE - 1);

        if (!boundError) {
          return {
            properties: boundData?.map(transformProperty) || [],
            nextPage: (boundCount && offset + PAGE_SIZE < boundCount) ? offset + PAGE_SIZE : undefined,
          };
        }
      }

      // If we have user coordinates, use the geospatial RPC to include distance
      if (userCoords) {
        const { data: geoData, error: geoError } = await supabase.rpc('get_properties_geospatial', {
          p_user_lat: userCoords.latitude,
          p_user_lng: userCoords.longitude,
          p_radius_km: radiusKm,
          p_type: filters.listingType || null,
          p_category: filters.propertyType?.length ? filters.propertyType : null,
          p_bedrooms: filters.bhk?.length ? filters.bhk : null,
          p_furnishing: filters.furnishing?.length ? filters.furnishing : null,
          p_min_price: filters.minPrice || null,
          p_max_price: filters.maxPrice || null,
          p_search_query: searchQuery || null,
          p_sort_by: sortBy,
          p_limit: PAGE_SIZE,
          p_offset: offset
        });

        if (!geoError) {
          const count = geoData?.[0]?.total_count || 0;
          const nextOffset = offset + PAGE_SIZE;
          return {
            properties: geoData?.map(transformProperty) || [],
            nextPage: (count && nextOffset < count) ? nextOffset : undefined,
          };
        }
        console.error('Error fetching geospatial properties:', geoError);
      }

      // Fallback or default: Use the prioritized RPC
      const userCity = localStorage.getItem('user_city');
      const { data: prioritizedData, error: prioritizedError } = await supabase.rpc('get_properties_prioritized', {
        p_city: userCity || null,
        p_type: filters.listingType || null,
        p_category: filters.propertyType?.length ? filters.propertyType : null,
        p_bedrooms: filters.bhk?.length ? filters.bhk : null,
        p_furnishing: filters.furnishing?.length ? filters.furnishing : null,
        p_min_price: filters.minPrice || null,
        p_max_price: filters.maxPrice || null,
        p_search_query: searchQuery || null,
        p_sort_by: sortBy,
        p_limit: PAGE_SIZE,
        p_offset: offset
      });

      if (prioritizedError) {
        // If RPC is missing or has a structure error, we can still fallback
        console.error('Error fetching prioritized properties:', prioritizedError);
        
        // PGRST116: Function not found, 42804: Structure mismatch
        const isRpcError = prioritizedError.code === 'PGRST116' || prioritizedError.code === '42804' || prioritizedError.code === 'PGRST202';
        
        if (!isRpcError) {
          throw prioritizedError;
        }

        // Fallback to regular query if RPC fails
        let query = supabase.from('properties').select('*', { count: 'exact' });
        
        if (filters.listingType) query = query.eq('type', filters.listingType);
        if (filters.propertyType?.length) query = query.in('property_category', filters.propertyType);
        if (filters.bhk?.length) query = query.in('bedrooms', filters.bhk);
        if (filters.furnishing?.length) query = query.in('furnishing_status', filters.furnishing);
        if (filters.minPrice) query = query.gte('price', filters.minPrice);
        if (filters.maxPrice) query = query.lte('price', filters.maxPrice);
        
        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,locality.ilike.%${searchQuery}%`);
        }

        if (sortBy === 'price-low') query = query.order('price', { ascending: true });
        else if (sortBy === 'price-high') query = query.order('price', { ascending: false });
        else query = query.order('created_at', { ascending: false });

        const { data: fallbackData, count: fallbackCount, error: fallbackError } = await query
          .range(offset, offset + PAGE_SIZE - 1);

        if (fallbackError) throw fallbackError;

        return {
          properties: fallbackData?.map(transformProperty) || [],
          nextPage: (fallbackCount && offset + PAGE_SIZE < fallbackCount) ? offset + PAGE_SIZE : undefined,
        };
      }
      
      const count = prioritizedData?.[0]?.total_count || 0;
      const nextOffset = offset + PAGE_SIZE;
      
      return {
        properties: prioritizedData?.map(transformProperty) || [],
        nextPage: (count && nextOffset < count) ? nextOffset : undefined,
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

            {/* Listing Type Tabs & Geospatial Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar w-full md:w-auto">
                {['rent', 'sale'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      const newType = filters.listingType === type ? undefined : (type as ListingType);
                      setFilters((prev) => ({
                        ...prev,
                        listingType: newType,
                      }));
                      // Update URL
                      const params = new URLSearchParams(searchParams);
                      if (newType) {
                        params.set('type', newType);
                      } else {
                        params.delete('type');
                      }
                      setSearchParams(params);
                    }}
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

                {userCoords && (
                  <div className="flex items-center gap-2 ml-4 border-l pl-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Radius</span>
                    <div className="flex bg-secondary rounded-lg p-1">
                      {[5, 10, 25, 50].map((r) => (
                        <button
                          key={r}
                          onClick={() => setRadiusKm(r)}
                          className={cn(
                            'px-3 py-1 rounded-md text-xs font-medium transition-all',
                            radiusKm === r 
                              ? 'bg-background text-foreground shadow-sm' 
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {r}km
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-2">
                  {locationLoading && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-xs font-medium">Locating...</span>
                    </div>
                  )}
                  {userCoords && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-xs font-medium">Near You</span>
                    </div>
                  )}
                  {locationError && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                      <span className="text-xs font-medium">Location Off</span>
                    </div>
                  )}
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-background border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
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
                <button
                  onClick={() => setViewMode('map')}
                  className={cn(
                    'p-2 transition-colors',
                    viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                  )}
                >
                  <MapIcon className="w-5 h-5" />
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
                onBoundsChange={setMapBounds}
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
              {filteredProperties.map((property, index) => (
                <PropertyCard
                  key={`${property.id}-${index}`}
                  property={property}
                  variant={viewMode === 'list' ? 'horizontal' : 'default'}
                  radiusKm={radiusKm}
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
              <Button onClick={clearFilters}>Clear all filters</Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
