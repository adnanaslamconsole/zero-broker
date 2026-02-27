import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Property } from '@/types/property';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Home } from 'lucide-react';

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

L.Marker.prototype.options.icon = DefaultIcon;

interface PropertyMapProps {
  properties: Property[];
  center?: [number, number];
  zoom?: number;
}

// Component to update map view when properties change
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function PropertyMap({ properties, center = [12.9716, 77.5946], zoom = 12 }: PropertyMapProps) {
  // Default center is Bangalore if not provided

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-border relative z-0">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} zoom={zoom} />
        
        {properties.map((property) => (
          property.latitude && property.longitude ? (
            <Marker 
              key={property.id} 
              position={[property.latitude, property.longitude]}
            >
              <Popup className="min-w-[250px]">
                <div className="p-1">
                  <div className="aspect-video rounded-md overflow-hidden mb-2 relative">
                    <img 
                      src={property.images[0]} 
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-background/90 px-2 py-0.5 rounded text-xs font-semibold">
                      ₹{(property.price / 1000).toFixed(0)}k
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-1 mb-1">{property.title}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <Home className="w-3 h-3" />
                    <span>{property.bhk} BHK</span>
                    <span>•</span>
                    <span>{property.locality}</span>
                  </div>
                  <Button size="sm" className="w-full h-8 text-xs" asChild>
                    <Link to={`/property/${property.id}`}>
                      View Details <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}
      </MapContainer>
    </div>
  );
}
