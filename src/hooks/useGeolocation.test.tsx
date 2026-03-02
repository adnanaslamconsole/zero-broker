import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useGeolocation } from './useGeolocation';

type PermissionState = 'granted' | 'denied' | 'prompt';

type MockPermissions = {
  query: (p: { name: 'geolocation' }) => Promise<{ state: PermissionState }>;
};

type MockGeolocation = {
  getCurrentPosition: (
    successCallback: PositionCallback,
    errorCallback?: PositionErrorCallback | null,
    options?: PositionOptions
  ) => void;
};

const TestComponent = ({ autoRequest }: { autoRequest: boolean }) => {
  const geo = useGeolocation({ autoRequest });
  return (
    <div>
      <div data-testid="loading">{geo.loading ? '1' : '0'}</div>
      <div data-testid="permission">{geo.permission}</div>
      <div data-testid="coords">
        {geo.coords ? `${geo.coords.latitude},${geo.coords.longitude}` : ''}
      </div>
      <div data-testid="errorType">{geo.errorType ?? ''}</div>
      <div data-testid="error">{geo.error ?? ''}</div>
      <button type="button" onClick={geo.requestLocation}>
        request
      </button>
    </div>
  );
};

describe('useGeolocation', () => {
  const originalGeolocation = navigator.geolocation;
  const originalPermissions = (navigator as unknown as { permissions?: MockPermissions }).permissions;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn<MockGeolocation['getCurrentPosition']>(),
      } satisfies MockGeolocation,
    });
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn<MockPermissions['query']>(async () => ({ state: 'prompt' })),
      } satisfies MockPermissions,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: originalGeolocation });
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: originalPermissions });
  });

  it('hydrates from cache without calling geolocation', async () => {
    localStorage.setItem(
      'zb_geo_cache_v1',
      JSON.stringify({ latitude: 1, longitude: 2, accuracy: 10, timestamp: Date.now() })
    );

    render(<TestComponent autoRequest={true} />);

    expect(await screen.findByTestId('coords')).toHaveTextContent('1,2');
    expect(vi.mocked((navigator.geolocation as MockGeolocation).getCurrentPosition)).not.toHaveBeenCalled();
  });

  it('auto-requests location and sets coords on success', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn<MockGeolocation['getCurrentPosition']>((onSuccess) => {
          onSuccess({
            coords: { latitude: 12.3, longitude: 45.6, accuracy: 9 } as GeolocationCoordinates,
            timestamp: Date.now(),
          } as GeolocationPosition);
        }),
      } satisfies MockGeolocation,
    });

    render(<TestComponent autoRequest={true} />);

    expect(await screen.findByTestId('coords')).toHaveTextContent('12.3,45.6');
  });

  it('does not auto-request when permission is denied', async () => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn<MockPermissions['query']>(async () => ({ state: 'denied' })),
      } satisfies MockPermissions,
    });

    render(<TestComponent autoRequest={true} />);

    expect(await screen.findByTestId('errorType')).toHaveTextContent('denied');
    expect(vi.mocked((navigator.geolocation as MockGeolocation).getCurrentPosition)).not.toHaveBeenCalled();
  });

  it('maps PERMISSION_DENIED when permissions API is unsupported', async () => {
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn<MockGeolocation['getCurrentPosition']>((_onSuccess, onError) => {
          onError?.({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
        }),
      } satisfies MockGeolocation,
    });

    render(<TestComponent autoRequest={false} />);

    await act(async () => {
      screen.getByRole('button', { name: 'request' }).click();
    });

    expect(await screen.findByTestId('errorType')).toHaveTextContent('denied');
  });
});
