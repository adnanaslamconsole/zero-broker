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
      <div className="rounded-3xl border border-primary/20 bg-primary/5 px-6 py-5 flex items-center justify-between gap-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
          <div className="text-base font-bold tracking-tight text-primary">Pinpointing your location...</div>
        </div>
        <div className="text-xs font-black uppercase tracking-widest text-primary/60 hidden sm:block">Searching Nearby</div>
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
    ? 'Enable location access to discover premium properties in your immediate vicinity.'
    : isUnavailable
      ? 'Please enable device location services for the most accurate property matches.'
      : 'Continue with manual search or try to re-detect your location.';

  return (
    <div
      className={cn(
        'rounded-[2rem] border-2 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 transition-all duration-500',
        isDenied 
          ? 'border-destructive/20 bg-destructive/5' 
          : 'border-primary/20 bg-primary/5 shadow-lg shadow-primary/5'
      )}
    >
      <div className="flex items-start gap-5">
        <div
          className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner',
            isDenied ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          )}
        >
          {isDenied ? <TriangleAlert className="w-7 h-7" /> : <MapPin className="w-7 h-7" />}
        </div>
        <div>
          <div className="text-lg font-black tracking-tight">{title}</div>
          <p className="text-sm text-muted-foreground mt-1 font-medium max-w-md">{description}</p>
          <div className="inline-flex mt-4 items-center gap-2 px-3 py-1 rounded-full bg-background/50 border border-border/50 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
            {platform.toUpperCase()} Optimized
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant={isDenied ? 'destructive' : 'default'}
          size="lg"
          onClick={onRequest}
          disabled={permission === 'denied'}
          className="rounded-2xl px-8 font-black uppercase text-xs tracking-widest h-14"
        >
          {isDenied ? 'Permissions Needed' : 'Enable Location'}
        </Button>
      </div>
    </div>
  );
}

