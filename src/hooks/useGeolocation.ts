import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearCachedCoords,
  loadCachedCoords,
  mapGeolocationError,
  saveCachedCoords,
  type GeoErrorType,
  type GeoPermissionState,
} from '@/lib/geolocation';

interface GeolocationState {
  coords: {
    latitude: number;
    longitude: number;
  } | null;
  loading: boolean;
  error: string | null;
  errorType: GeoErrorType | null;
  permission: GeoPermissionState;
  fromCache: boolean;
}

type UseGeolocationOptions = {
  autoRequest?: boolean;
};

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    loading: false,
    error: null,
    errorType: null,
    permission: 'unsupported',
    fromCache: false,
  });

  const canUseGeolocation = useMemo(() => Boolean(navigator.geolocation), []);

  const queryPermission = useCallback(async (): Promise<GeoPermissionState> => {
    try {
      const anyNavigator = navigator as unknown as {
        permissions?: { query: (p: { name: string }) => Promise<{ state: GeoPermissionState }> };
      };
      if (!anyNavigator.permissions?.query) return 'unsupported';
      const res = await anyNavigator.permissions.query({ name: 'geolocation' });
      if (res?.state === 'granted' || res?.state === 'denied' || res?.state === 'prompt') return res.state;
      return 'unsupported';
    } catch {
      return 'unsupported';
    }
  }, []);

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        coords: null,
        errorType: 'unsupported',
        permission: 'unsupported',
        error: 'Location is not supported on this device/browser.',
        fromCache: false,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      errorType: null,
      fromCache: false,
    }));

    const permission = await queryPermission();
    setState((prev) => ({ ...prev, permission }));

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          saveCachedCoords({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
          });
          setState({
            coords,
            loading: false,
            error: null,
            errorType: null,
            permission: permission === 'unsupported' ? 'granted' : permission,
            fromCache: false,
          });
          resolve();
        },
        async (error) => {
          const mapped = mapGeolocationError(error);
          const nextPermission = await queryPermission();
          setState({
            coords: null,
            loading: false,
            error: mapped.message,
            errorType: mapped.type,
            permission: nextPermission,
            fromCache: false,
          });
          resolve();
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60_000,
        }
      );
    });
  }, [queryPermission]);

  const clearCache = useCallback(() => {
    clearCachedCoords();
    setState((prev) => ({ ...prev, fromCache: false }));
  }, []);

  useEffect(() => {
    if (!canUseGeolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        coords: null,
        errorType: 'unsupported',
        permission: 'unsupported',
        error: 'Location is not supported on this device/browser.',
        fromCache: false,
      }));
      return;
    }

    const cached = loadCachedCoords();
    if (cached) {
      setState((prev) => ({
        ...prev,
        coords: { latitude: cached.latitude, longitude: cached.longitude },
        loading: false,
        error: null,
        errorType: null,
        fromCache: true,
      }));
    }

    queryPermission().then((permission) => {
      setState((prev) => ({ ...prev, permission }));
      const shouldAuto = Boolean(options.autoRequest);
      if (!shouldAuto) return;
      if (cached) return;
      if (permission === 'denied') {
        setState((prev) => ({
          ...prev,
          loading: false,
          coords: null,
          errorType: 'denied',
          error: 'Location access was denied. Enable location permissions to see nearby properties.',
        }));
        return;
      }
      requestLocation();
    });
  }, [canUseGeolocation, options.autoRequest, queryPermission, requestLocation]);

  return {
    ...state,
    requestLocation,
    clearCache,
  };
};
