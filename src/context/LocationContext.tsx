import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { type GeoErrorType, type GeoPermissionState, isLikelyMobile } from '@/lib/geolocation';

interface LocationContextType {
  coords: { latitude: number; longitude: number } | null;
  loading: boolean;
  error: string | null;
  errorType: GeoErrorType | null;
  permission: GeoPermissionState;
  fromCache: boolean;
  requestLocation: () => Promise<void>;
  clearCache: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const geo = useGeolocation({ autoRequest: false });
  const { requestLocation, coords, permission, fromCache, loading } = geo;

  useEffect(() => {
    const shouldAutoRequest = isLikelyMobile();
    if (!shouldAutoRequest) return;
    if (coords) return;
    if (fromCache) return;
    if (permission === 'denied') return;
    if (loading) return;
    
    // Slight delay to ensure the app is fully hydrated and ready for a prompt
    const timer = setTimeout(() => {
      requestLocation();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [coords, fromCache, loading, permission, requestLocation]);

  return (
    <LocationContext.Provider value={geo}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
