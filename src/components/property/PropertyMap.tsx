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
import { ArrowRight, Home, MapPin, Navigation } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
const createCustomIcon = (price: number, type: string) => {
  const formattedPrice = price >= 10000000 
    ? `${(price / 10000000).toFixed(1)}Cr` 
    : price >= 100000 
      ? `${(price / 100000).toFixed(1)}L` 
      : `${(price / 1000).toFixed(0)}k`;

  return L.divIcon({
    className: 'custom-property-marker',
    html: `
      <div class="flex items-center justify-center bg-primary text-primary-foreground px-2 py-1 rounded-full shadow-lg border-2 border-background font-bold text-xs whitespace-nowrap hover:scale-110 transition-transform">
        ${type === 'rent' ? '₹' : ''}${formattedPrice}
      </div>
    `,
    iconSize: [40, 24],
    iconAnchor: [20, 12],
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
                  icon={createCustomIcon(property.price, property.type)}
                >
                  <Popup className="property-map-popup min-w-[280px]">
                    <div className="p-0 overflow-hidden rounded-lg">
                      <div className="aspect-[16/10] relative">
                        <img 
                          src={property.images[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'} 
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          <Badge variant={property.type === 'rent' ? 'secondary' : 'default'} className="w-fit shadow-md uppercase text-[10px]">
                            For {property.type}
                          </Badge>
                          {property.distanceKm !== undefined && (
                            <Badge variant="outline" className="w-fit bg-background/80 backdrop-blur-sm shadow-md text-[10px] gap-1">
                              <Navigation className="w-2.5 h-2.5" />
                              {property.distanceKm.toFixed(1)} km
                            </Badge>
                          )}
                        </div>
                        <div className="absolute bottom-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded font-bold text-sm shadow-lg">
                          ₹{property.price.toLocaleString('en-IN')}
                        </div>
                      </div>
                      
                      <div className="p-3">
                        <h3 className="font-bold text-sm line-clamp-1 mb-1">{property.title}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{property.locality}, {property.city}</span>
                        </div>
                        
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 text-xs font-medium">
                            <div className="flex items-center gap-1">
                              <Home className="w-3.5 h-3.5 text-primary" />
                              <span>{property.bedrooms} BHK</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">|</span>
                              <span>{property.area} sqft</span>
                            </div>
                          </div>
                          
                          <Button size="sm" className="h-8 px-3 text-xs gap-1" asChild>
                            <Link to={`/property/${property.id}`}>
                              View <ArrowRight className="w-3 h-3" />
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
          width: 280px !important;
        }
        .custom-property-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
