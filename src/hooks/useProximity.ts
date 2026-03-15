import { useState, useEffect } from 'react';

interface ProximityState {
  isWithinRadius: boolean;
  distance: number | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
}

export function useProximity(targetLat: number, targetLon: number, radiusMeters: number = 50) {
  const [state, setState] = useState<ProximityState>({
    isWithinRadius: false,
    distance: null,
    accuracy: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation not supported', isLoading: false }));
      return;
    }

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3; // Earth radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // in meters
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const dist = calculateDistance(latitude, longitude, targetLat, targetLon);
        
        setState({
          isWithinRadius: dist <= radiusMeters,
          distance: dist,
          accuracy: accuracy,
          error: null,
          isLoading: false,
        });
      },
      (err) => {
        setState(prev => ({ 
          ...prev, 
          error: err.code === 1 ? 'Location permission denied' : 'Error getting location', 
          isLoading: false 
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [targetLat, targetLon, radiusMeters]);

  return state;
}
