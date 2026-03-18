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

type TabType = 'all' | 'rent' | 'buy' | 'pg' | 'commercial';

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: Search },
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
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null);

  const handleSearch = () => {
    if (!searchQuery) return;
    
    const params = new URLSearchParams();
    params.set('q', searchQuery);
    
    if (activeTab !== 'all') {
      params.set('type', activeTab);
    }
    
    if (selectedLocation) {
      params.set('lat', selectedLocation.lat.toString());
      params.set('lng', selectedLocation.lon.toString());
    }

    navigate(`/properties?${params.toString()}`);
  };

  return (
    <section className="relative min-h-[80vh] lg:min-h-[85vh] flex items-center bg-background hero-pattern overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Desktop Video Background */}
        <div className="absolute inset-0 hidden md:block">
          <iframe
            className="w-full h-full object-cover scale-110 opacity-60"
            src="https://www.youtube.com/embed/wsQBs_QRexA?autoplay=1&mute=1&loop=1&playlist=wsQBs_QRexA&controls=0&modestbranding=1&showinfo=0&rel=0"
            title="Luxury home tour video background"
            allow="autoplay; fullscreen; picture-in-picture"
          />
        </div>

        {/* Mobile Static Background */}
        <div className="absolute inset-0 md:hidden">
          <img 
            src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=2070" 
            alt="Luxury Home" 
            className="w-full h-full object-cover opacity-40"
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-background md:from-black/70" />
        <div className="absolute top-20 left-10 w-48 h-48 sm:w-72 sm:h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-64 h-64 sm:w-96 sm:h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-12 sm:py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 sm:mb-6"
          >
            <Badge variant="zeroBrokerage" className="px-3 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-sm bg-white/10 text-white border-white/20 backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
              100% Verified Properties • Zero Brokerage
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl xxs:text-4xl xs:text-5xl sm:text-7xl lg:text-8xl font-display font-black text-white mb-6 tracking-tight leading-[0.95]"
          >
            Find Your <span className="text-accent underline decoration-accent/30 underline-offset-[12px]">Perfect Home</span>
            <br />
            <span className="text-white/90">Without Brokerage</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl lg:text-2xl text-white/80 mb-10 sm:mb-14 max-w-3xl mx-auto px-4 font-medium leading-relaxed"
          >
            Connect directly with property owners. No middlemen, no commission. 
            Over <span className="text-white font-bold">50 lakh</span> happy customers across 30+ cities.
          </motion.p>

          {/* Search Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white/95 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] p-5 sm:p-8 lg:p-10 search-bar text-left mx-2 sm:mx-0 border border-white/20"
          >
            {/* Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 mb-4 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 sm:gap-2.5 px-3 py-2 sm:px-7 sm:py-4 rounded-xl sm:rounded-2xl font-black text-[10px] xs:text-xs sm:text-sm transition-all whitespace-nowrap touch-friendly uppercase tracking-widest shrink-0',
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-lg sm:shadow-2xl shadow-primary/40 scale-[1.02] sm:scale-105'
                      : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:items-center">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-4 sm:left-5 flex items-center pointer-events-none z-20">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary/40 group-focus-within:text-primary transition-colors" />
                </div>
                <LocationSearch 
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onLocationSelect={(loc) => {
                    setSelectedLocation({ lat: loc.lat, lon: loc.lon });
                  }}
                  placeholder="Enter city, locality..."
                  className="w-full h-14 sm:h-20 pl-11 sm:pl-14 rounded-xl sm:rounded-3xl border-2 border-secondary bg-secondary/20 focus-visible:ring-primary focus-visible:border-primary transition-all text-sm sm:text-lg font-semibold"
                />
              </div>
              <Button size="xl" className="w-full lg:w-auto gap-2 sm:gap-3 px-6 sm:px-10 h-14 sm:h-20 rounded-xl sm:rounded-3xl text-base sm:text-xl font-black shadow-xl sm:shadow-2xl shadow-primary/30 hover:scale-[1.01] sm:hover:scale-[1.02] active:scale-95 transition-all shrink-0" onClick={handleSearch}>
                <Search className="w-5 h-5 sm:w-6 sm:h-6" />
                Find Homes
                <ArrowRight className="w-5 h-5 hidden sm:block" />
              </Button>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-4 sm:mt-5 items-center">
              <span className="text-[10px] sm:text-sm font-medium text-muted-foreground mr-1">Popular:</span>
              {['Koramangala', 'Indiranagar', 'HSR Layout'].map((locality) => (
                <button
                  key={locality}
                  className="text-[10px] sm:text-sm font-medium text-primary hover:text-accent transition-colors bg-primary/5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg hover:bg-primary/10 touch-friendly"
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
            className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 mt-12 sm:mt-16"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-2 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="text-xl sm:text-3xl lg:text-4xl font-display font-bold text-white mb-0.5 sm:mb-1">
                  {stat.value}
                </div>
                <div className="text-[10px] sm:text-xs lg:text-sm font-medium text-white/60 uppercase tracking-wider">{stat.label}</div>
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
