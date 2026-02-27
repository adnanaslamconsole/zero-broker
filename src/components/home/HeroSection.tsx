import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Home, 
  Building2, 
  Key, 
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LocationSearch } from '@/components/property/LocationSearch';

type TabType = 'rent' | 'buy' | 'pg' | 'commercial';

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'rent', label: 'Rent', icon: Key },
  { id: 'buy', label: 'Buy', icon: Home },
  { id: 'pg', label: 'PG/Hostel', icon: Building2 },
  { id: 'commercial', label: 'Commercial', icon: Building2 },
];

const stats = [
  { value: '50L+', label: 'Happy Customers' },
  { value: '10L+', label: 'Active Listings' },
  { value: '30+', label: 'Cities' },
  { value: '₹5000Cr+', label: 'Brokerage Saved' },
];

export function HeroSection() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('rent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null);

  const handleSearch = () => {
    if (!searchQuery) return;
    
    const params = new URLSearchParams();
    params.set('q', searchQuery);
    params.set('type', activeTab);
    
    if (selectedLocation) {
      params.set('lat', selectedLocation.lat.toString());
      params.set('lng', selectedLocation.lon.toString());
    }

    navigate(`/properties?${params.toString()}`);
  };

  return (
    <section className="relative min-h-[85vh] flex items-center bg-background hero-pattern overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0">
          <iframe
            className="w-full h-full object-cover scale-110"
            src="https://www.youtube.com/embed/wsQBs_QRexA?autoplay=1&mute=1&loop=1&playlist=wsQBs_QRexA&controls=0&modestbranding=1&showinfo=0&rel=0"
            title="Luxury home tour video background"
            allow="autoplay; fullscreen; picture-in-picture"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-background" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <Badge variant="zeroBrokerage" className="px-4 py-1.5 text-sm bg-white/10 text-white border-white/20">
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              100% Verified Properties • Zero Brokerage
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white mb-4 text-balance"
          >
            Find Your Perfect Home
            <br />
            <span className="text-white/80">Without Paying Brokerage</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-white/70 mb-10 max-w-2xl mx-auto"
          >
            Connect directly with property owners. No middlemen, no commission, 
            no hassle. Over 50 lakh happy customers across 30+ cities.
          </motion.p>

          {/* Search Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 search-bar text-left"
          >
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap',
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:bg-secondary'
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <LocationSearch 
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onLocationSelect={(loc) => {
                    setSelectedLocation({ lat: loc.lat, lon: loc.lon });
                  }}
                  placeholder="Enter city, locality or landmark..."
                  className="w-full"
                />
              </div>
              <Button size="xl" className="gap-2 px-8 h-14 rounded-xl" onClick={handleSearch}>
                <Search className="w-5 h-5" />
                Search
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 mt-4 items-center">
              <span className="text-sm text-muted-foreground">Popular:</span>
              {['Koramangala', 'Indiranagar', 'HSR Layout', 'Whitefield'].map((locality) => (
                <button
                  key={locality}
                  className="text-sm text-primary hover:text-accent transition-colors bg-primary/5 px-2 py-1 rounded-md hover:bg-primary/10"
                  onClick={() => setSearchQuery(locality)}
                >
                  {locality}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl sm:text-3xl font-display font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-white/60">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
        >
          <path
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
}
