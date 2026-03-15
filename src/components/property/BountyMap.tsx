import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Property } from '@/types/property';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Video, ShieldCheck, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProximity } from '@/hooks/useProximity';

const bountyIcon = L.divIcon({
  className: 'custom-bounty-marker',
  html: `
    <div class="flex items-center justify-center bg-amber-500 text-white w-8 h-8 rounded-full shadow-lg border-2 border-white animate-bounce">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface BountyMapProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  userLocation: [number, number];
}

export function BountyMap({ properties, onSelectProperty, userLocation }: BountyMapProps) {
  return (
    <div className="h-[600px] w-full rounded-3xl overflow-hidden border-4 border-white shadow-2xl relative z-0">
      <MapContainer 
        center={userLocation} 
        zoom={16} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* User Location Marker */}
        <Marker position={userLocation} icon={L.divIcon({
          className: 'user-marker',
          html: `<div class="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg ring-4 ring-primary/20"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })} />

        {properties.filter(p => p.bountyReward).map((property) => (
          <BountyMarker 
            key={property.id} 
            property={property} 
            onSelect={onSelectProperty} 
          />
        ))}
      </MapContainer>
    </div>
  );
}

function BountyMarker({ property, onSelect }: { property: Property, onSelect: (p: Property) => void }) {
  const { isWithinRadius, distance } = useProximity(property.latitude, property.longitude, 50);

  return (
    <>
      <Marker 
        position={[property.latitude, property.longitude]} 
        icon={bountyIcon}
      >
        <Popup className="bounty-popup">
          <div className="p-4 space-y-4 min-w-[240px]">
            <div className="flex items-center justify-between">
              <Badge className="bg-amber-500 text-white font-black px-3 py-1 rounded-xl">
                ₹{property.bountyReward} REWARD
              </Badge>
              {distance !== null && (
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  {Math.round(distance)}m Away
                </span>
              )}
            </div>
            
            <div className="space-y-1">
              <h3 className="font-black text-lg tracking-tight leading-tight">{property.title}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {property.locality}
              </p>
            </div>

            <div className={cn(
              "p-3 rounded-2xl flex flex-col items-center gap-2 text-center transition-all",
              isWithinRadius ? "bg-green-50 border border-green-200" : "bg-secondary/50 border border-dashed border-border"
            )}>
              {isWithinRadius ? (
                <>
                  <ShieldCheck className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="text-xs font-black text-green-700 uppercase">Within Range</p>
                    <p className="text-[10px] text-green-600 font-medium">Ready for verification</p>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-black h-10 rounded-xl mt-1 gap-2"
                    onClick={() => onSelect(property)}
                  >
                    <Video className="w-4 h-4" /> Start Audit
                  </Button>
                </>
              ) : (
                <>
                  <Target className="w-6 h-6 text-muted-foreground opacity-50" />
                  <div>
                    <p className="text-xs font-black text-muted-foreground uppercase">Proximity Locked</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Move closer ({Math.round((distance || 0) - 50)}m more)</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </Popup>
      </Marker>
      <Circle 
        center={[property.latitude, property.longitude]} 
        radius={50} 
        pathOptions={{ 
          fillColor: isWithinRadius ? '#22c55e' : '#f59e0b', 
          color: isWithinRadius ? '#16a34a' : '#d97706',
          weight: 2,
          fillOpacity: 0.1 
        }} 
      />
    </>
  );
}
