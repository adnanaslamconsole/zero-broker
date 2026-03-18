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
  Target,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react';
import { LocationSearch } from '@/components/property/LocationSearch';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PropertyCard } from '@/components/property/PropertyCard';
import { PropertyMap } from '@/components/property/PropertyMap';
import { BountyMap } from '@/components/property/BountyMap';
import { VideoAuditPortal } from '@/components/property/VideoAuditPortal';
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
import { LocationAccessBanner } from '@/components/location/LocationAccessBanner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Property, PropertyFilters, ListingType, PropertyType, FurnishingType } from '@/types/property';
import { queryClient } from '@/lib/queryClient';
import { getItemWithTTL, setItemWithTTL, removeItem } from '@/lib/localStorageTTL';

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
  bountyVerificationStatus: dbProperty.bounty_verification_status,
  bountyReward: dbProperty.bounty_reward, // Assuming we join or add to RPC
  createdAt: dbProperty.created_at,
  updatedAt: dbProperty.updated_at,
});

// Extracted FilterContent component for reuse in Sheet and Desktop panel
function FilterContent({ 
  filters, 
  setFilters, 
  toggleFilter 
}: { 
  filters: PropertyFilters; 
  setFilters: React.Dispatch<React.SetStateAction<PropertyFilters>>;
  toggleFilter: (key: keyof PropertyFilters, value: string | number) => void;
}) {
  return (
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
            className="w-full bg-background/50"
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
            className="w-full bg-background/50"
          />
        </div>
      </div>
    </div>
  );
}

export default function Properties() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map' | 'bounty'>('list');
  const [selectedBounty, setSelectedBounty] = useState<Property | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]); // Default Bangalore
  const [mapBounds, setMapBounds] = useState<{ ne: [number, number]; sw: [number, number] } | null>(null);
  const [lastBbox, setLastBbox] = useState<{ ne: [number, number]; sw: [number, number] } | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const {
    coords: userCoords,
    loading: locationLoading,
    error: locationError,
    errorType: locationErrorType,
    permission: locationPermission,
    requestLocation,
    fromCache: locationFromCache,
  } = useGeolocation({ autoRequest: false });
  const { user } = useAuth();
  const { toast } = useToast();
  const hasCenteredOnUser = useRef(false);

  // Filters state (Category 7: God Mode Persistence)
  const [filters, setFilters] = useState<PropertyFilters>(() => {
    const type = searchParams.get('type') as ListingType;
    const property = searchParams.get('property');
    const bhk = searchParams.get('bhk')?.split(',').map(Number).filter(n => !isNaN(n)) || [];
    const furnishing = searchParams.get('furnishing')?.split(',') as FurnishingType[] || [];
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    return {
      listingType: type || undefined,
      propertyType: property ? [property as PropertyType] : [],
      bhk: bhk,
      furnishing: furnishing.filter(f => ['furnished', 'semi-furnished', 'unfurnished'].includes(f)),
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    };
  });

  const [userCity, setUserCity] = useState<string | null>(getItemWithTTL<string>('user_city'));

  // Sync URL search params with filters state
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    // Add/Update URL params based on current filter state
    if (filters.listingType) params.set('type', filters.listingType); else params.delete('type');
    if (filters.propertyType?.length) params.set('property', filters.propertyType[0]); else params.delete('property');
    if (filters.bhk?.length) params.set('bhk', filters.bhk.join(',')); else params.delete('bhk');
    if (filters.furnishing?.length) params.set('furnishing', filters.furnishing.join(',')); else params.delete('furnishing');
    if (filters.minPrice) params.set('minPrice', filters.minPrice.toString()); else params.delete('minPrice');
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice.toString()); else params.delete('maxPrice');
    if (searchQuery) params.set('q', searchQuery); else params.delete('q');

    // Prevent infinite loop by checking if params actually changed
    const currentParams = searchParams.toString();
    const nextParams = params.toString();
    if (currentParams !== nextParams) {
      setSearchParams(params, { replace: true });
    }
  }, [filters, searchQuery, setSearchParams]);

  useEffect(() => {
    if (!userCoords) return;
    if (hasCenteredOnUser.current) return;
    setMapCenter([userCoords.latitude, userCoords.longitude]);
    hasCenteredOnUser.current = true;
  }, [userCoords, locationFromCache]);

  const handleBoundsChange = (newBounds: { ne: [number, number]; sw: [number, number] }) => {
    setMapBounds(newBounds);
    
    // Check if we should show "Search this area"
    if (lastBbox) {
      const dist = Math.abs(newBounds.ne[0] - lastBbox.ne[0]) + Math.abs(newBounds.ne[1] - lastBbox.ne[1]);
      if (dist > 0.005) { // Threshold for significant movement
        setShowSearchArea(true);
      }
    } else {
      setLastBbox(newBounds);
    }
  };

  const handleSearchArea = () => {
    setLastBbox(mapBounds);
    setShowSearchArea(false);
    queryClient.invalidateQueries({ queryKey: ['properties'] });
  };

  const [sortBy, setSortBy] = useState('relevance');
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: [
      'properties',
      user?.profile?.id,
      filters.listingType,
      JSON.stringify(filters.propertyType),
      JSON.stringify(filters.bhk),
      JSON.stringify(filters.furnishing),
      filters.minPrice,
      filters.maxPrice,
      searchQuery,
      sortBy,
      userCoords ? Number(userCoords.latitude.toFixed(4)) : null,
      userCoords ? Number(userCoords.longitude.toFixed(4)) : null,
      radiusKm,
      viewMode === 'map' ? mapBounds?.sw : null,
      viewMode === 'map' ? lastBbox?.sw : null, // Trigger refetch on bbox search
      viewMode,
      userCity
    ],
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
      let { data: prioritizedData, error: prioritizedError } = await supabase.rpc('get_properties_prioritized', {
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

      // FALLBACK: If we have a city filter but it returns 0 results, try a global search
      // to ensure the user doesn't see an empty page just because of their location.
      if (!prioritizedError && (!prioritizedData || prioritizedData.length === 0) && userCity) {
        console.log(`[Properties] No results for ${userCity}. Falling back to global search.`);
        const { data: globalData, error: globalError } = await supabase.rpc('get_properties_prioritized', {
          p_city: null, // Clear city for fallback
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
        
        if (!globalError && globalData && globalData.length > 0) {
          prioritizedData = globalData;
        }
      }

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

  const handleClearCity = () => {
    removeItem('user_city');
    removeItem('user_lat');
    removeItem('user_lng');
    removeItem('location_detected');
    setUserCity(null);
    queryClient.invalidateQueries({ queryKey: ['properties'] });
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

  const scrollToProperty = (id: string) => {
    const element = document.getElementById(`property-card-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setSelectedPropertyId(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-6">
        <div className="container mx-auto px-4">
          <div className="mb-4 sm:mb-6">
            <LocationAccessBanner
              loading={locationLoading}
              coords={userCoords}
              error={locationError}
              errorType={locationErrorType}
              permission={locationPermission}
              onRequest={requestLocation}
            />
          </div>
          {/* Premium Search Experience */}
          <div className="bg-card/50 backdrop-blur-2xl rounded-[2rem] border border-white/20 p-4 sm:p-5 mb-8 sm:mb-10 shadow-2xl relative z-20 group">
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
              <div className="flex-1">
                <LocationSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onLocationSelect={(loc) => {
                    setMapCenter([loc.lat, loc.lon]);
                    // If it's a city search, we might want to center the map
                    if (viewMode !== 'map') setViewMode('map');
                    
                    // Reset category to "All" when a new location is selected as per user request
                    setFilters((prev) => ({ ...prev, listingType: undefined }));
                    const params = new URLSearchParams(searchParams);
                    params.delete('type');
                    setSearchParams(params);
                  }}
                  className="w-full"
                />
              </div>
              
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                {isMobile ? (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-16 flex-1 px-6 rounded-2xl border-border/50 bg-background/50 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/30 transition-all gap-3 group/btn"
                      >
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                          <SlidersHorizontal className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-bold tracking-tight">Filters</span>
                        {activeFilterCount > 0 && (
                          <Badge className="bg-primary text-primary-foreground font-black px-2 py-0.5 rounded-lg text-[10px]">
                            {activeFilterCount}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-[2rem] border-t-0 bg-card/95 backdrop-blur-xl">
                      <SheetHeader className="p-6 border-b border-border/50 text-left">
                        <div className="flex items-center justify-between">
                          <SheetTitle className="text-xl font-display font-black tracking-tight">Filters</SheetTitle>
                          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-primary font-bold">
                            Reset All
                          </Button>
                        </div>
                      </SheetHeader>
                      <div className="p-6 overflow-y-auto h-[calc(85vh-85px)] custom-scrollbar pb-24">
                        <FilterContent 
                          filters={filters} 
                          setFilters={setFilters} 
                          toggleFilter={toggleFilter} 
                        />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border/50">
                        <Button className="w-full h-14 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-primary/20" onClick={() => (document.querySelector('[data-radix-collection-item]') as any)?.click()}>
                          Show {filteredProperties.length} Results
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                ) : (
                  <Button
                    variant="outline"
                    className="h-16 px-6 rounded-2xl border-border/50 bg-background/50 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/30 transition-all gap-3 group/btn"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                      <SlidersHorizontal className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-bold tracking-tight">Advanced Filters</span>
                    {activeFilterCount > 0 && (
                      <Badge className="bg-primary text-primary-foreground font-black px-2 py-0.5 rounded-lg text-[10px]">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                )}

                <div className="bg-secondary/30 backdrop-blur-md rounded-2xl border border-border/30 p-1.5 flex items-center gap-1.5 h-16">
                  {[
                    { mode: 'grid', icon: Grid3X3 },
                    { mode: 'list', icon: List },
                    { mode: 'map', icon: MapIcon },
                    { mode: 'bounty', icon: Target },
                  ].map(({ mode, icon: Icon }) => (
                    <Button
                      key={mode}
                      variant={viewMode === mode ? 'default' : 'ghost'}
                      size="icon"
                      className={cn(
                        "h-12 w-12 rounded-xl transition-all duration-300",
                        viewMode === mode 
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105" 
                          : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                      )}
                      onClick={() => setViewMode(mode as any)}
                    >
                      <Icon className="w-5 h-5" />
                    </Button>
                  ))}
                </div>

                <Button 
                  className="h-16 px-10 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all bg-primary"
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, listingType: undefined }));
                    const params = new URLSearchParams(searchParams);
                    params.delete('type');
                    setSearchParams(params);
                  }}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>

            {/* Premium Category Toggle & Quick Actions */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-8 pt-6 border-t border-border/30">
              <div className="flex items-center gap-4 bg-muted/50 p-1.5 rounded-2xl border border-border/50 w-full md:w-auto">
                <button
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, listingType: undefined }));
                    const params = new URLSearchParams(searchParams);
                    params.delete('type');
                    setSearchParams(params);
                  }}
                  className={cn(
                    'flex-1 md:flex-none px-8 py-3 rounded-[1.15rem] text-sm font-black uppercase tracking-wider transition-all duration-300',
                    filters.listingType === undefined
                      ? 'bg-background text-primary shadow-xl shadow-black/5 ring-1 ring-black/5 scale-105'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/30'
                  )}
                >
                  All
                </button>
                {['rent', 'sale'].map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      const newType = type as ListingType;
                      setFilters((prev) => ({
                        ...prev,
                        listingType: newType,
                      }));
                      const params = new URLSearchParams(searchParams);
                      params.set('type', newType);
                      setSearchParams(params);
                    }}
                    className={cn(
                      'flex-1 md:flex-none px-8 py-3 rounded-[1.15rem] text-sm font-black uppercase tracking-wider transition-all duration-300',
                      filters.listingType === type
                        ? 'bg-background text-primary shadow-xl shadow-black/5 ring-1 ring-black/5 scale-105'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/30'
                    )}
                  >
                    {type === 'rent' ? 'Rent' : 'Sale'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                {userCoords && (
                  <div className="hidden lg:flex items-center gap-3 bg-secondary/20 px-4 py-2 rounded-2xl border border-secondary/30">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Radius</span>
                    <div className="flex gap-1">
                      {[10, 25, 50].map((r) => (
                        <button
                          key={r}
                          onClick={() => setRadiusKm(r)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                            radiusKm === r
                              ? 'bg-primary text-primary-foreground shadow-inner'
                              : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                          )}
                        >
                          {r}km
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!userCoords && !locationLoading && (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="rounded-2xl border-dashed border-primary/30 text-primary font-bold hover:bg-primary/5 h-14" 
                    onClick={requestLocation}
                  >
                    <MapPin className="w-5 h-5 mr-2" />
                    Locate Me
                  </Button>
                )}

                <div className="relative group/sort">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none bg-background border border-border/50 rounded-2xl px-6 pr-12 h-14 text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none cursor-pointer shadow-sm hover:border-primary/30"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price-low">Lowest Price</option>
                    <option value="price-high">Highest Price</option>
                    <option value="newest">Newly Listed</option>
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none group-hover/sort:text-primary transition-colors" />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Filters Panel */}
          {!isMobile && showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card rounded-xl border border-border p-4 sm:p-6 mb-6 overflow-hidden shadow-lg"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="font-semibold text-foreground">Filters</h3>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </div>

              <FilterContent 
                filters={filters} 
                setFilters={setFilters} 
                toggleFilter={toggleFilter} 
              />
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
                {userCity && (
                  <span className="ml-2 inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-bold transition-all hover:bg-primary/20 cursor-default">
                    <MapPin className="w-3 h-3" />
                    {userCity}
                    <button 
                      onClick={handleClearCity}
                      className="ml-1 hover:text-destructive transition-colors"
                      title="Clear location"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
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

              {/* Premium View Switcher */}
              <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/40 backdrop-blur-md">
                {[
                  { id: 'list', label: 'List', icon: List },
                  { id: 'grid', label: 'Grid', icon: Grid3X3 },
                  { id: 'map', label: 'Map', icon: MapIcon },
                  { id: 'bounty', label: 'Bounty', icon: Target },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id as any)}
                    className={cn(
                      'flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300',
                      viewMode === mode.id
                        ? 'bg-background text-primary shadow-xl shadow-black/5 ring-1 ring-black/5 scale-105'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                    )}
                  >
                    <mode.icon className={cn("w-4 h-4", viewMode === mode.id ? "text-primary" : "text-muted-foreground/60")} />
                    <span className="hidden lg:inline-block">{mode.label}</span>
                  </button>
                ))}
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

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground animate-pulse font-bold">Discovering amazing matches...</p>
            </div>
          ) : viewMode === 'map' ? (
            <div className="h-[calc(100vh-280px)] sm:h-[calc(100vh-280px)] sticky top-24 rounded-[2.5rem] overflow-hidden border border-border/50 shadow-2xl relative">
              <PropertyMap
                properties={filteredProperties}
                center={mapCenter}
                onBoundsChange={handleBoundsChange}
                selectedPropertyId={selectedPropertyId}
                onMarkerClick={(p) => {
                  scrollToProperty(p.id);
                  if (isMobile) {
                    document.getElementById('mobile-property-sheet')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              />
              
              {showSearchArea && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-top-4 duration-300">
                  <Button 
                    onClick={handleSearchArea}
                    className="bg-background/90 backdrop-blur-md text-primary hover:bg-background border-none shadow-2xl rounded-full px-8 py-4 font-black text-xs uppercase tracking-widest gap-2 group ring-2 ring-primary/20"
                  >
                    <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Search this area
                  </Button>
                </div>
              )}

              {isMobile && (
                <motion.div 
                  initial={{ y: '80%' }}
                  animate={{ y: selectedPropertyId ? '40%' : '80%' }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={0.2}
                  className="absolute bottom-0 left-0 right-0 z-[1000] bg-background/95 backdrop-blur-3xl rounded-t-[3rem] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] border-t border-border/50 overflow-hidden flex flex-col h-[85%]"
                  id="mobile-property-sheet"
                >
                  <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto my-4 shrink-0" />
                  <div className="flex-1 overflow-y-auto px-4 pb-12">
                    <div className="flex flex-col gap-4">
                      {filteredProperties.map((property) => (
                        <div 
                          key={property.id} 
                          id={`property-card-${property.id}`}
                          className={cn(
                            "transition-all duration-300",
                            selectedPropertyId === property.id ? "scale-[1.02]" : ""
                          )}
                          onClick={() => setSelectedPropertyId(property.id)}
                        >
                          <PropertyCard
                            property={property}
                            variant="horizontal"
                            radiusKm={radiusKm}
                          />
                        </div>
                      ))}
                      {hasNextPage && (
                        <div ref={observerTarget} className="h-20 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ) : viewMode === 'bounty' ? (
            <div className="space-y-8">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-inner">
                <div className="w-20 h-20 bg-amber-500 rounded-[2rem] flex items-center justify-center shadow-xl shadow-amber-500/20 shrink-0">
                  <Target className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-amber-600">Neighborhood Bounty Board</h2>
                  <p className="text-amber-700/70 font-medium font-display">Verified residents get paid for auditing nearby listings.</p>
                </div>
                <div className="ml-auto">
                    <Button variant="outline" className="h-14 px-8 border-amber-500/30 text-amber-600 font-black rounded-2xl bg-white/50 backdrop-blur-md">
                        VIEW RULES
                    </Button>
                </div>
              </div>

              {selectedBounty ? (
                <VideoAuditPortal 
                  property={selectedBounty} 
                  onSuccess={() => {
                    setSelectedBounty(null);
                    queryClient.invalidateQueries({ queryKey: ['properties'] });
                  }}
                  onCancel={() => setSelectedBounty(null)}
                />
              ) : (
                <BountyMap 
                  properties={filteredProperties}
                  userLocation={[mapCenter[0], mapCenter[1]]}
                  onSelectProperty={setSelectedBounty}
                />
              )}
            </div>
          ) : filteredProperties.length > 0 ? (
            <div
              className={cn(
                "grid gap-8",
                viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
              )}
            >
              {filteredProperties.map((property) => (
                <div 
                  key={property.id} 
                  id={`property-card-${property.id}`}
                  onMouseEnter={() => setSelectedPropertyId(property.id)}
                  onMouseLeave={() => setSelectedPropertyId(null)}
                  className={cn(
                    "transition-all duration-500 rounded-[2rem]",
                    selectedPropertyId === property.id ? "ring-2 ring-primary ring-offset-8 scale-[1.02] shadow-[0_40px_80px_-15px_rgba(255,77,28,0.2)]" : ""
                  )}
                >
                  <PropertyCard
                    property={property}
                    variant={viewMode === 'list' ? 'horizontal' : 'default'}
                    radiusKm={radiusKm}
                  />
                </div>
              ))}
              
              <div 
                ref={observerTarget} 
                className="col-span-full py-12 flex flex-col items-center justify-center border-t border-dashed border-border/50 mt-8"
              >
                {hasNextPage ? (
                  <>
                    <Loader2 className="w-10 h-10 animate-spin text-primary/30 mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">Fetching more properties</p>
                  </>
                ) : (
                  <p className="text-sm font-bold text-muted-foreground/30">You've explored all properties in this area</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 px-6 bg-muted/20 rounded-[3rem] border border-dashed border-border/50">
              <div className="w-24 h-24 bg-background/80 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl border border-white/20">
                <Search className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <h3 className="text-3xl font-black text-foreground mb-4 tracking-tight">No properties found</h3>
              <p className="text-muted-foreground mb-10 max-w-sm mx-auto font-medium">
                Try widening your search radius or adjusting your filters to find more properties.
              </p>
              <Button 
                onClick={clearFilters}
                className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-widest"
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
