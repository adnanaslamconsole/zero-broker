import { useEffect } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { isLikelyMobile } from '@/lib/geolocation';

export function MobileLocationBootstrap() {
  const shouldAutoRequest = isLikelyMobile();
  const { requestLocation, coords, permission, fromCache, loading } = useGeolocation({ autoRequest: false });

  useEffect(() => {
    if (!shouldAutoRequest) return;
    if (coords) return;
    if (fromCache) return;
    if (permission === 'denied') return;
    if (loading) return;
    requestLocation();
  }, [coords, fromCache, loading, permission, requestLocation, shouldAutoRequest]);

  return null;
}
