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

// Premium price badge icon creator
const createCustomIcon = (price: number, listingType: string, isSelected?: boolean) => {
  const formattedPrice = price >= 10000000 
    ? `${(price / 10000000).toFixed(1)}Cr` 
    : price >= 100000 
      ? `${(price / 100000).toFixed(1)}L` 
      : `${(price / 1000).toFixed(0)}k`;

  const unit = listingType === 'rent' ? '/mo' : '';
  
  return L.divIcon({
    className: 'custom-property-marker-container',
    html: `
      <div class="price-marker-pill ${isSelected ? 'selected' : ''}">
        <span class="currency">₹</span>
        <span class="amount">${formattedPrice}</span>
        ${unit ? `<span class="unit">${unit}</span>` : ''}
        <div class="marker-pointer"></div>
      </div>
    `,
    iconSize: [60, 32],
    iconAnchor: [30, 32],
    popupAnchor: [0, -32],
  });
};

// Custom Cluster Icon Creator
const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 'sm' : count < 50 ? 'md' : 'lg';
  
  return L.divIcon({
    html: `<div class="cluster-marker ${size}"><span>${count}</span></div>`,
    className: 'custom-cluster-marker',
    iconSize: L.point(40, 40),
  });
};

L.Marker.prototype.options.icon = DefaultIcon;

interface PropertyMapProps {
  properties: Property[];
  center?: [number, number];
  zoom?: number;
  onBoundsChange?: (bounds: { ne: [number, number]; sw: [number, number] }) => void;
  radiusKm?: number;
  selectedPropertyId?: string | null;
  onMarkerClick?: (property: Property) => void;
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
  radiusKm,
  selectedPropertyId,
  onMarkerClick
}: PropertyMapProps) {
  const [mapReady, setMapReady] = useState(false);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-border relative z-0 bg-muted/30">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        preferCanvas={true}
        whenReady={() => setMapReady(true)}
        className="leaflet-container-safeguard"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={center} zoom={zoom} onBoundsChange={onBoundsChange} />
        
        {mapReady && (
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={60}
            showCoverageOnHover={false}
            iconCreateFunction={createClusterIcon}
            spiderfyOnMaxZoom={true}
            removeOutsideVisibleBounds={true}
            animate={true}
          >
            {properties.map((property) => (
              property.latitude && property.longitude ? (
                <Marker 
                  key={property.id} 
                  position={[property.latitude, property.longitude]}
                  icon={createCustomIcon(
                    property.price, 
                    property.listingType, 
                    selectedPropertyId === property.id
                  )}
                  eventHandlers={{
                    click: () => onMarkerClick?.(property),
                  }}
                >
                  <Popup className="property-map-popup">
                    <div className="w-[340px] bg-background rounded-[2.5rem] overflow-hidden shadow-2xl border border-border/40 group/popup relative">
                      {/* Hero Image Section */}
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img 
                          src={property.images[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'} 
                          alt={property.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover/popup:scale-105"
                        />
                        
                        {/* Premium Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        
                        {/* Status Badge - Top Left */}
                        <div className="absolute top-5 left-5">
                          <div className={cn(
                            "px-5 py-2 rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] border-none shadow-xl backdrop-blur-md ring-1 ring-white/20",
                            property.listingType === 'rent' 
                              ? "bg-blue-500/90 text-white" 
                              : "bg-white text-[#cc6600]"
                          )}>
                            {property.listingType === 'rent' ? 'FOR RENT' : 'FOR SALE'}
                          </div>
                        </div>

                        {/* Price Tag - Prominent Overlay */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[85%] animate-in fade-in slide-in-from-bottom-4 duration-700">
                          <div className="bg-[#ff4d1c] text-white px-8 py-4 rounded-[1.5rem] shadow-[0_20px_40px_-10px_rgba(255,77,28,0.5)] flex items-center justify-center font-display border border-white/10">
                            <span className="text-3xl font-black tracking-tighter">₹{property.price.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Content Section */}
                      <div className="p-7">
                        <h3 className="text-[22px] font-black text-foreground leading-[1.2] mb-3 tracking-tight group-hover/popup:text-primary transition-colors line-clamp-2">
                          {property.title}
                        </h3>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground/70 mb-8">
                          <MapPin className="w-4 h-4 shrink-0 text-primary/50" />
                          <span className="truncate font-semibold tracking-tight">{property.locality}, {property.city}</span>
                        </div>
                        
                        <div className="flex items-center justify-between gap-6">
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                                  <Home className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex flex-col -space-y-1">
                                  <span className="text-xl font-black">{property.bhk}</span>
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">BHK</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="w-px h-10 bg-border/40" />
                            
                            <div className="flex flex-col">
                              <div className="flex flex-col -space-y-1">
                                <span className="text-xl font-black">{property.carpetArea}</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">SQFT</span>
                              </div>
                            </div>
                          </div>
                          
                          <Button 
                            className="h-[60px] px-8 bg-[#ff4d1c] hover:bg-[#e64619] text-white rounded-[1.35rem] font-black uppercase tracking-widest text-[11px] gap-2 shadow-xl shadow-orange-500/20 active:scale-95 transition-all group/btn border border-white/10" 
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
        .leaflet-container-safeguard {
          background: #f8fafc !important;
        }
        .leaflet-popup-content-wrapper {
          padding: 0;
          overflow: hidden;
          border-radius: 2.5rem;
          box-shadow: 0 40px 80px -15px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .leaflet-popup-content {
          margin: 0;
          width: 340px !important;
        }
        .leaflet-popup-tip-container {
          display: none;
        }
        .custom-property-marker-container {
          background: transparent !important;
          border: none !important;
        }
        
        /* Premium Price Badge Styles */
        .price-marker-pill {
          background: #ffffff;
          color: #0f172a;
          padding: 8px 16px;
          border-radius: 1.25rem;
          font-weight: 900;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 3px;
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
          white-space: nowrap;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          transform: translateZ(0);
          border: 1.5px solid #e2e8f0;
        }
        
        .price-marker-pill:hover {
          transform: translateY(-4px) scale(1.1);
          box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.2);
          z-index: 1000;
          border-color: #ff4d1c;
          color: #ff4d1c;
        }
        
        .price-marker-pill.selected {
          background: #ff4d1c;
          color: #ffffff;
          border-color: #ff4d1c;
          transform: translateY(-6px) scale(1.15);
          box-shadow: 0 25px 40px -10px rgba(255, 77, 28, 0.4);
          z-index: 1001;
        }
        
        .price-marker-pill .currency {
          font-size: 12px;
          opacity: 0.8;
          font-weight: 700;
        }
        
        .price-marker-pill .unit {
          font-size: 10px;
          opacity: 0.6;
          margin-left: 2px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .marker-pointer {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid #ffffff;
          transition: all 0.3s ease;
          filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.1));
        }
        
        .price-marker-pill.selected .marker-pointer {
          border-top-color: #ff4d1c;
        }

        /* Cluster Styles */
        .custom-cluster-marker {
          background: transparent !important;
        }
        .cluster-marker {
          width: 40px;
          height: 40px;
          background: rgba(59, 130, 246, 0.9);
          backdrop-filter: blur(4px);
          border: 3px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 800;
          font-size: 14px;
          box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.4);
          transition: all 0.3s ease;
        }
        .cluster-marker:hover {
          transform: scale(1.1);
          background: #2563eb;
        }
        .cluster-marker.md {
          width: 48px;
          height: 48px;
          background: rgba(37, 99, 235, 0.9);
        }
        .cluster-marker.lg {
          width: 56px;
          height: 56px;
          background: rgba(29, 78, 216, 0.9);
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
