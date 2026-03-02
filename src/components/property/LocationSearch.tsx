import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Building2, MapPin, Navigation, Search, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { searchLocations, type LocationResult, type LocationSearchMeta } from '@/lib/locationSearchService';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // We debounce input changes to avoid firing a network request on every keystroke.
  // 350ms stays within the requested 300–500ms range while still feeling responsive.
  const debouncedValue = useDebouncedValue(value, 350);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    if (activeDropdownCloser === closeDropdown) activeDropdownCloser = null;
  }, []);

  useEffect(() => {
    setHasSearched(false);
  }, [value]);

  useEffect(() => {
    // Cancel any in-flight request when a new debounced query arrives.
    // This prevents duplicate/overlapping calls and ensures the UI only shows results for the latest query.
    abortRef.current?.abort();
    abortRef.current = null;

    const normalized = debouncedValue.trim();
    if (!normalized || normalized.length < 3) {
      setIsLoading(false);
      setErrorMessage(null);
      setSuggestions([]);
      setMeta({ strategy: 'none', queryUsed: normalized });
      setHasSearched(false);
      closeDropdown();
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
      })
      .catch((err) => {
        if ((err as Error)?.name === 'AbortError') return;
        setSuggestions([]);
        setMeta({ strategy: 'none', queryUsed: normalized });
        setErrorMessage('Could not search locations right now. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [closeDropdown, debouncedValue]);

  // Ensure only one LocationSearch dropdown is open globally at a time.
  // This prevents multiple instances (e.g. home hero + other overlays) from appearing to open "twice".
  useEffect(() => {
    if (!isOpen) return;
    if (activeDropdownCloser && activeDropdownCloser !== closeDropdown) activeDropdownCloser();
    activeDropdownCloser = closeDropdown;
    return () => {
      if (activeDropdownCloser === closeDropdown) activeDropdownCloser = null;
    };
  }, [closeDropdown, isOpen]);

  // Close dropdown when clicking outside / pressing Escape.
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
    // Use a more descriptive query value so downstream property search can match better.
    // Example: "Ghanta Ghar, Kanpur, Uttar Pradesh" instead of only "Ghanta Ghar".
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
    if (type === 'city') return <Building2 className="w-4 h-4 text-primary" />;
    return <MapPin className="w-4 h-4 text-muted-foreground" />;
  };

  const showPanel = useMemo(() => {
    if (!isOpen) return false;
    if (isLoading) return true;
    if (errorMessage) return true;
    if (suggestions.length > 0) return true;
    if (hasSearched && value.trim().length >= 3) return true;
    return false;
  }, [errorMessage, hasSearched, isLoading, isOpen, suggestions.length, value]);

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
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-12 pr-12 h-14 bg-background border-border/50 shadow-sm hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-base rounded-xl"
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
              setMeta({ strategy: 'none', queryUsed: '' });
              setErrorMessage(null);
              closeDropdown();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-secondary rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showPanel && (
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
              {meta.strategy === 'fallback_city' && (
                <div className="px-4 pb-2 text-xs text-muted-foreground">
                  No exact match. Showing results for {meta.fallbackCityQuery}.
                </div>
              )}

              {errorMessage ? (
                <div className="px-4 py-3 text-sm text-destructive">{errorMessage}</div>
              ) : isLoading ? (
                <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching…
                </div>
              ) : suggestions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">No results found.</div>
              ) : (
                <ul className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {suggestions.map((item) => {
                    const parts = item.display_name.split(', ').filter(Boolean);
                    const mainName = parts[0] ?? item.display_name;
                    const secondaryName = parts.slice(1).join(', ');

                    return (
                      <li
                        key={item.place_id}
                        className="px-4 py-3 hover:bg-primary/5 cursor-pointer flex items-start gap-3 transition-colors group/item border-b border-border/50 last:border-0"
                        onClick={() => handleSelect(item)}
                      >
                        <div className="mt-1 p-2 bg-secondary rounded-full group-hover/item:bg-primary/10 transition-colors">
                          {getIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate group-hover/item:text-primary transition-colors">
                            {mainName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{secondaryName}</p>
                        </div>
                        <div className="mt-2 opacity-0 group-hover/item:opacity-100 transition-opacity -translate-x-2 group-hover/item:translate-x-0 duration-300">
                          <Navigation className="w-3 h-3 text-primary -rotate-45" />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
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
