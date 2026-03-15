import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import { Property } from '@/types/property';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Home, MapPin, Navigation, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for properties
const createCustomIcon = (price: number, listingType: string) => {
  const formattedPrice = price >= 10000000 
    ? `${(price / 10000000).toFixed(1)}Cr` 
    : price >= 100000 
      ? `${(price / 100000).toFixed(1)}L` 
      : `${(price / 1000).toFixed(0)}k`;

  return L.divIcon({
    className: 'custom-property-marker',
    html: `
      <div class="flex items-center justify-center bg-primary text-primary-foreground px-2 py-1 rounded-full shadow-lg border-2 border-background font-black text-[10px] whitespace-nowrap hover:scale-110 transition-transform">
        ${listingType === 'rent' ? '₹' : ''}${formattedPrice}
      </div>
    `,
    iconSize: [46, 28],
    iconAnchor: [23, 14],
  });
};

L.Marker.prototype.options.icon = DefaultIcon;

interface PropertyMapProps {
  properties: Property[];
  center?: [number, number];
  zoom?: number;
  onBoundsChange?: (bounds: { ne: [number, number]; sw: [number, number] }) => void;
  radiusKm?: number;
}

// Component to update map view and handle events
function MapController({ center, zoom, onBoundsChange }: { 
  center: [number, number]; 
  zoom: number;
  onBoundsChange?: (bounds: { ne: [number, number]; sw: [number, number] }) => void;
}) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

  useMapEvents({
    moveend: () => {
      if (onBoundsChange) {
        const bounds = map.getBounds();
        onBoundsChange({
          ne: [bounds.getNorthEast().lat, bounds.getNorthEast().lng],
          sw: [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
        });
      }
    },
  });

  return null;
}

export function PropertyMap({ 
  properties, 
  center = [12.9716, 77.5946], 
  zoom = 12,
  onBoundsChange,
  radiusKm
}: PropertyMapProps) {
  const [mapReady, setMapReady] = useState(false);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-border relative z-0 bg-muted/30">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={center} zoom={zoom} onBoundsChange={onBoundsChange} />
        
        {mapReady && (
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
            showCoverageOnHover={false}
          >
            {properties.map((property) => (
              property.latitude && property.longitude ? (
                <Marker 
                  key={property.id} 
                  position={[property.latitude, property.longitude]}
                  icon={createCustomIcon(property.price, property.listingType)}
                >
                  <Popup className="property-map-popup">
                    <div className="w-[300px] bg-background rounded-[1.5rem] overflow-hidden shadow-2xl border border-border/50 group/popup">
                      {/* Hero Image Section */}
                      <div className="relative aspect-[4/3]">
                        <img 
                          src={property.images[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'} 
                          alt={property.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/popup:scale-110"
                        />
                        
                        {/* Floating Badge */}
                        <div className="absolute top-4 left-4">
                          <Badge className={cn(
                            "px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px] border-none shadow-lg backdrop-blur-md",
                            property.listingType === 'rent' 
                              ? "bg-[#e2f0ff] text-[#0066cc]" 
                              : "bg-[#fff0e2] text-[#cc6600]"
                          )}>
                            FOR {property.listingType}
                          </Badge>
                        </div>

                        {/* Price Tag */}
                        <div className="absolute bottom-4 right-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <div className="bg-[#ff4d1c] text-white px-5 py-2.5 rounded-[1rem] shadow-xl shadow-orange-500/30 flex items-center justify-center font-display">
                            <span className="text-xl font-black">₹{property.price.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {/* Close button hint (just for aesthetics in the screenshot) */}
                        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white/80 pointer-events-none">
                          <X className="w-4 h-4" />
                        </div>
                      </div>
                      
                      {/* Content Section */}
                      <div className="p-5">
                        <h3 className="text-xl font-black text-foreground leading-tight mb-2 tracking-tight group-hover/popup:text-primary transition-colors">
                          {property.title}
                        </h3>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground/80 mb-6">
                          <MapPin className="w-4 h-4 shrink-0 text-primary/60" />
                          <span className="truncate font-medium">{property.locality}, {property.city}</span>
                        </div>
                        
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-5">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <Home className="w-5 h-5 text-primary" />
                                <span className="text-lg font-black">{property.bhk}</span>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 ml-7 -mt-1">BHK</span>
                            </div>
                            
                            <div className="w-px h-8 bg-border/60" />
                            
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-black">{property.carpetArea}</span>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 -mt-1">sqft</span>
                            </div>
                          </div>
                          
                          <Button 
                            className="h-14 px-8 bg-[#ff4d1c] hover:bg-[#e64619] text-white rounded-[1.25rem] font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-orange-500/20 active:scale-95 transition-all group/btn" 
                            asChild
                          >
                            <Link to={`/property/${property.id}`}>
                              VIEW DETAILS
                              <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ) : null
            ))}
          </MarkerClusterGroup>
        )}
      </MapContainer>
      
      <style>{`
        .leaflet-popup-content-wrapper {
          padding: 0;
          overflow: hidden;
          border-radius: 0.75rem;
        }
        .leaflet-popup-content {
          margin: 0;
          width: 300px !important;
        }
        .custom-property-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
