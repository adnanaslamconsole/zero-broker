import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';

export function LocationDetector() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    const hasDetected = localStorage.getItem('location_detected');
    if (!hasDetected) {
      // Small delay to not be intrusive immediately
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDetect = () => {
    setIsDetecting(true);
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setIsDetecting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocoding to get city name
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || 'Unknown Location';
          
          localStorage.setItem('location_detected', 'true');
          localStorage.setItem('user_city', city);
          localStorage.setItem('user_lat', latitude.toString());
          localStorage.setItem('user_lng', longitude.toString());
          
          toast.success(`Location detected: ${city}`);
          setIsOpen(false);
          
          // Optionally trigger a page reload or context update if needed
          // window.location.reload(); 
        } catch (error) {
          console.error('Error detecting location', error);
          toast.error('Failed to get location details');
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        console.error('Geolocation error', error);
        toast.error('Location access denied. Please search manually.');
        setIsDetecting(false);
        setIsOpen(false); // Close anyway
        localStorage.setItem('location_detected', 'skipped');
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">ZeroBroker wants to know your location</DialogTitle>
          <DialogDescription className="text-center">
            We need your location to show you the best properties, services, and packers & movers in your area.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button size="lg" onClick={handleDetect} disabled={isDetecting} className="w-full gap-2">
            {isDetecting ? (
              'Detecting...'
            ) : (
              <>
                <Navigation className="w-4 h-4" /> Use Current Location
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-muted-foreground">
            I'll search manually
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
