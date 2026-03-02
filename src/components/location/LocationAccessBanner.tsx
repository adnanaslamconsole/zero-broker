import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { detectPlatform, type GeoErrorType, type GeoPermissionState } from '@/lib/geolocation';
import { Loader2, MapPin, TriangleAlert } from 'lucide-react';

type Props = {
  loading: boolean;
  coords: { latitude: number; longitude: number } | null;
  error: string | null;
  errorType: GeoErrorType | null;
  permission: GeoPermissionState;
  onRequest: () => void;
};

export function LocationAccessBanner({ loading, coords, error, errorType, permission, onRequest }: Props) {
  const platform = detectPlatform();

  if (coords) return null;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <div className="text-sm font-medium">Detecting your location…</div>
        </div>
        <div className="text-xs text-muted-foreground">Nearby properties will load automatically.</div>
      </div>
    );
  }

  if (!error) return null;

  const isDenied = errorType === 'denied' || permission === 'denied';
  const isUnavailable = errorType === 'unavailable';

  const title = isDenied
    ? 'Location access is off'
    : isUnavailable
      ? 'Location services are unavailable'
      : 'Unable to detect location';

  const description = isDenied
    ? 'Enable location access to see nearby properties. You can still search manually by city/locality.'
    : isUnavailable
      ? 'Turn on device location services and try again. You can still search manually by city/locality.'
      : 'Try again, or continue with manual search by city/locality.';

  const steps =
    platform === 'ios'
      ? 'iOS: Settings → Safari → Location → Allow (or Ask). Also check Settings → Privacy & Security → Location Services.'
      : platform === 'android'
        ? 'Android: Chrome → Settings → Site settings → Location → Allow. Also enable Location in device settings.'
        : 'Browser: Allow location for this site in your browser settings, and enable device location services.';

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
        isDenied ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center',
            isDenied ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
          )}
        >
          {isDenied ? <TriangleAlert className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-sm text-muted-foreground mt-0.5">{description}</div>
          <div className="text-xs text-muted-foreground mt-2">{steps}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button
          variant={isDenied ? 'destructive' : 'default'}
          size="sm"
          onClick={onRequest}
          disabled={permission === 'denied'}
        >
          Enable location
        </Button>
      </div>
    </div>
  );
}

