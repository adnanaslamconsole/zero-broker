import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from '@/context/LocationContext';
import { Input } from '@/components/ui/input';
import { Building2, MapPin, Navigation, Search, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { searchLocations, type LocationResult, type LocationSearchMeta } from '@/lib/locationSearchService';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

let activeDropdownCloser: (() => void) | null = null;

interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: { lat: number; lon: number; name: string }) => void;
  className?: string;
  placeholder?: string;
}

export function LocationSearch({ value, onChange, onLocationSelect, className, placeholder }: LocationSearchProps) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [meta, setMeta] = useState<LocationSearchMeta>({ strategy: 'none', queryUsed: '' });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { requestLocation, coords, loading: contextLoading } = useLocation();
  const lastRequestedCoords = useRef<{ lat: number, lon: number } | null>(null);

  const debouncedValue = useDebouncedValue(value, 350);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    if (activeDropdownCloser === closeDropdown) activeDropdownCloser = null;
  }, []);

  const handleDetectLocation = async () => {
    setIsDetecting(true);
    setIsOpen(true);
    await requestLocation();
    // Logic continues in useEffect when coords change
  };

  // Listen for global coords changes to handle reverse geocoding
  useEffect(() => {
    if (!coords || !isDetecting) return;
    
    // Prevent redundant reverse geocoding for the same coords
    if (lastRequestedCoords.current?.lat === coords.latitude && lastRequestedCoords.current?.lon === coords.longitude) {
      return;
    }
    
    lastRequestedCoords.current = { lat: coords.latitude, lon: coords.longitude };

    const performReverseGeocode = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1`
        );
        const data = await response.json();
        const cityName = data.address?.city || data.address?.town || data.address?.village || data.display_name.split(',')[0];
        
        onChange(cityName);
        onLocationSelect({
          lat: coords.latitude,
          lon: coords.longitude,
          name: cityName,
        });
        closeDropdown();
      } catch (error) {
        console.error('Reverse geocoding error:', error);
        toast.error('Could not determine city name');
      } finally {
        setIsDetecting(false);
      }
    };

    performReverseGeocode();
  }, [coords, isDetecting, onChange, onLocationSelect, closeDropdown]);

  // Sync isDetecting with context loading if it was started here
  useEffect(() => {
    if (!contextLoading && isDetecting && !coords) {
      setIsDetecting(false);
    }
  }, [contextLoading, isDetecting, coords]);

  useEffect(() => {
    setHasSearched(false);
  }, [value]);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    const normalized = debouncedValue.trim();
    if (!normalized || normalized.length < 2) {
      setIsLoading(false);
      setErrorMessage(null);
      setSuggestions([]);
      setMeta({ strategy: 'none', queryUsed: normalized });
      setHasSearched(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setHasSearched(true);
    setIsLoading(true);
    setErrorMessage(null);

    searchLocations(normalized, controller.signal)
      .then(({ results, meta: nextMeta }) => {
        setSuggestions(results);
        setMeta(nextMeta);
        if (results.length > 0) setIsOpen(true);
      })
      .catch((err) => {
        if ((err as Error)?.name === 'AbortError') return;
        setSuggestions([]);
        setMeta({ strategy: 'none', queryUsed: normalized });
        setErrorMessage('Could not search locations. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [debouncedValue]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeDropdownCloser && activeDropdownCloser !== closeDropdown) activeDropdownCloser();
    activeDropdownCloser = closeDropdown;
    return () => {
      if (activeDropdownCloser === closeDropdown) activeDropdownCloser = null;
    };
  }, [closeDropdown, isOpen]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDropdown();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeDropdown]);

  const handleSelect = (item: LocationResult) => {
    const parts = item.display_name.split(', ').filter(Boolean);
    const mainName = parts[0] ?? item.display_name;
    const context = parts.slice(1, 3).join(', ');
    const inputValue = context ? `${mainName}, ${context}` : mainName;
    
    onChange(inputValue);
    onLocationSelect({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      name: mainName,
    });
    closeDropdown();
  };

  const getIcon = (type?: string) => {
    if (type === 'city' || type === 'administrative') return <Building2 className="w-4 h-4 text-primary" />;
    return <MapPin className="w-4 h-4 text-muted-foreground" />;
  };

  const showPanel = useMemo(() => {
    if (!isOpen) return false;
    if (isLoading || isDetecting) return true;
    if (errorMessage) return true;
    if (suggestions.length > 0) return true;
    if (!value && isOpen) return true; // Show detect location option
    if (hasSearched && value.trim().length >= 2) return true;
    return false;
  }, [errorMessage, hasSearched, isLoading, isDetecting, isOpen, suggestions.length, value]);

  return (
    <div className={cn("relative group", className)} ref={containerRef}>
      <div className="relative transition-all duration-300">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
          <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <Input
          type="text"
          placeholder={placeholder || "Search city, area, or landmark..."}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-14 pr-12 h-16 bg-background border-border/50 shadow-sm hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-lg font-medium rounded-2xl"
        />
        {isLoading || isDetecting ? (
          <div className="absolute right-5 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : value && (
          <button
            onClick={() => {
              onChange('');
              setSuggestions([]);
              setMeta({ strategy: 'none', queryUsed: '' });
              setErrorMessage(null);
              closeDropdown();
            }}
            className="absolute right-5 top-1/2 -translate-y-1/2 p-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute z-[100] w-full mt-3 bg-card border border-border/50 shadow-2xl rounded-[1.5rem] overflow-hidden backdrop-blur-xl"
          >
            <div className="p-2 space-y-1">
              {!value && (
                <button
                  onClick={handleDetectLocation}
                  disabled={isDetecting}
                  className="w-full px-4 py-4 hover:bg-primary/5 text-primary text-sm font-bold flex items-center gap-4 transition-all group rounded-xl"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {isDetecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                  </div>
                  <div className="text-left">
                    <p className="font-black tracking-tight">Detect My Location</p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Instant GPS Search</p>
                  </div>
                </button>
              )}

              {value && suggestions.length > 0 && (
                <div className="px-4 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center justify-between border-b border-border/30 mb-1">
                  <span>Search Results</span>
                  <Badge variant="outline" className="text-[9px] font-black border-primary/20 text-primary">In India</Badge>
                </div>
              )}

              {errorMessage ? (
                <div className="px-5 py-6 text-sm text-destructive font-bold text-center bg-destructive/5 rounded-xl m-2 italic">
                  {errorMessage}
                </div>
              ) : suggestions.length === 0 && value.length >= 2 && !isLoading ? (
                <div className="px-5 py-6 text-sm text-muted-foreground font-medium text-center italic">
                  No matches found for "{value}"
                </div>
              ) : (
                <ul className="max-h-[380px] overflow-y-auto custom-scrollbar px-1 pb-1">
                  {suggestions.map((item) => {
                    const parts = item.display_name.split(', ').filter(Boolean);
                    const mainName = parts[0] ?? item.display_name;
                    const secondaryName = parts.slice(1, 4).join(', ');

                    return (
                      <li
                        key={item.place_id}
                        className="px-4 py-3.5 hover:bg-primary/5 cursor-pointer flex items-center gap-4 transition-all group/item rounded-xl"
                        onClick={() => handleSelect(item)}
                      >
                        <div className="w-12 h-12 flex-shrink-0 bg-muted/50 rounded-2xl flex items-center justify-center border border-border/50 group-hover/item:bg-primary/10 group-hover/item:border-primary/20 transition-all group-hover/item:scale-105">
                          {getIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base text-foreground truncate group-hover/item:text-primary transition-colors tracking-tight">
                            {mainName}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-medium">{secondaryName}</p>
                        </div>
                        <div className="opacity-0 group-hover/item:opacity-100 transition-all -translate-x-2 group-hover/item:translate-x-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Navigation className="w-3.5 h-3.5 text-primary -rotate-45" />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
