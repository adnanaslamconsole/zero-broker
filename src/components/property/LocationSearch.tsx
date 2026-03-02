import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Search, Loader2, X, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { appFetch } from '@/lib/requestAbort';

interface LocationResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    suburb?: string;
    neighbourhood?: string;
    road?: string;
    state?: string;
  };
  type?: string;
}

interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect: (location: { lat: number; lon: number; name: string }) => void;
  className?: string;
  placeholder?: string;
}

export function LocationSearch({ value, onChange, onLocationSelect, className, placeholder }: LocationSearchProps) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce logic
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, 400);
    return () => clearTimeout(handler);
  }, [value]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      if (!debouncedValue || debouncedValue.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await appFetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            debouncedValue
          )}&limit=8&addressdetails=1&countrycodes=in`
          ,
          { signal: controller.signal }
        );
        const data = await res.json();
        setSuggestions(data);
        setIsOpen(true);
      } catch (error) {
        if ((error as Error)?.name !== 'AbortError') {
          console.error('Failed to fetch locations', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
    return () => controller.abort();
  }, [debouncedValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: LocationResult) => {
    // Smart formatting
    const parts = item.display_name.split(', ');
    const mainName = parts[0];
    const subText = parts.slice(1, 3).join(', '); // Show next 2 parts (e.g. City, State)
    
    onChange(mainName);
    onLocationSelect({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      name: mainName,
    });
    setIsOpen(false);
  };

  const getIcon = (type?: string) => {
    if (type === 'city') return <Building2 className="w-4 h-4 text-primary" />;
    return <MapPin className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className={cn("relative group", className)} ref={containerRef}>
      <div className="relative transition-all duration-300">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
          <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <Input
          type="text"
          placeholder={placeholder || "Search locality, landmark, or city..."}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          className="pl-12 h-14 bg-background border-border/50 shadow-sm hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-base rounded-xl"
        />
        {isLoading ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : value && (
          <button
            onClick={() => {
              onChange('');
              setSuggestions([]);
              setIsOpen(false);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-popover/95 backdrop-blur-xl text-popover-foreground rounded-xl border border-border/50 shadow-2xl overflow-hidden"
          >
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Suggested Locations</span>
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">INDIA</span>
              </div>
              <ul className="max-h-[300px] overflow-y-auto custom-scrollbar">
                {suggestions.map((item) => {
                  const parts = item.display_name.split(', ');
                  const mainName = parts[0];
                  const secondaryName = parts.slice(1).join(', ');

                  return (
                    <li
                      key={item.place_id}
                      className="px-4 py-3 hover:bg-primary/5 cursor-pointer flex items-start gap-3 transition-colors group/item border-b border-border/50 last:border-0"
                      onClick={() => handleSelect(item)}
                    >
                      <div className="mt-1 p-2 bg-secondary rounded-full group-hover/item:bg-primary/10 transition-colors">
                        <MapPin className="w-4 h-4 text-muted-foreground group-hover/item:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate group-hover/item:text-primary transition-colors">
                          {mainName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {secondaryName}
                        </p>
                      </div>
                      <div className="mt-2 opacity-0 group-hover/item:opacity-100 transition-opacity -translate-x-2 group-hover/item:translate-x-0 duration-300">
                        <Navigation className="w-3 h-3 text-primary -rotate-45" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground border-t flex items-center justify-between">
              <span className="flex items-center gap-1">
                Powered by <span className="font-semibold">OpenStreetMap</span>
              </span>
              <span>{suggestions.length} results found</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper component import
import { Building2 } from 'lucide-react';
