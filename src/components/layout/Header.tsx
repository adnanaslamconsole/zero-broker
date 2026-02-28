import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Building2, 
  ChevronDown,
  Bell,
  Plus,
  Building,
  Wrench,
  Crown,
  HelpCircle,
  ShieldCheck,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const navLinks = [
  {
    label: 'Rent',
    href: '/properties?type=rent',
    icon: Building2,
    submenu: [
      { label: 'Apartments', href: '/properties?type=rent&property=apartment' },
      { label: 'Villas', href: '/properties?type=rent&property=villa' },
      { label: 'PG/Hostel', href: '/properties?type=rent&property=pg' },
      { label: 'Commercial', href: '/properties?type=rent&property=commercial' },
    ],
  },
  {
    label: 'Buy',
    href: '/properties?type=sale',
    icon: Home,
    submenu: [
      { label: 'Apartments', href: '/properties?type=sale&property=apartment' },
      { label: 'Villas', href: '/properties?type=sale&property=villa' },
      { label: 'Plots', href: '/properties?type=sale&property=plot' },
      { label: 'Commercial', href: '/properties?type=sale&property=commercial' },
    ],
  },
  {
    label: 'Services',
    href: '/services',
    icon: Wrench,
    submenu: [
      { label: 'Packers & Movers', href: '/services/packers-movers' },
      { label: 'Home Cleaning', href: '/services/cleaning' },
      { label: 'Painting', href: '/services/painting' },
      { label: 'Pest Control', href: '/services/pest-control' },
    ],
  },
  {
    label: 'Plans',
    href: '/plans',
    icon: Crown,
  },
  {
    label: 'ZeroBrokerHood',
    href: '/society',
    icon: Building,
  },
];

export function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.profile?.roles?.includes('platform-admin');
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  // Fetch unread notifications count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications-count', user?.profile?.id],
    queryFn: async () => {
      if (!user || user.profile.isDemo) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.profile.id)
        .eq('is_read', false);
      
      if (error) {
        // If notifications table doesn't exist yet (404), return 0 gracefully
        if (error.code === 'PGRST116' || error.message?.includes('not found')) {
          return 0;
        }
        throw error;
      }
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Poll every 30s
  });

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50 transition-all duration-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0" aria-label="ZeroBroker Home">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent flex items-center justify-center transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 shadow-lg shadow-primary/20">
              <Home className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-display font-black text-foreground tracking-tighter leading-none group-hover:text-primary transition-colors">ZeroBroker</span>
              <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5 opacity-80 group-hover:opacity-100">Zero Brokerage</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative group"
                onMouseEnter={() => setActiveSubmenu(link.label)}
                onMouseLeave={() => setActiveSubmenu(null)}
              >
                <Link
                  to={link.href}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground/70 hover:text-primary rounded-xl hover:bg-primary/5 transition-all duration-300"
                  aria-haspopup={link.submenu ? "true" : "false"}
                >
                  <link.icon className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                  {link.label}
                  {link.submenu && <ChevronDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:rotate-180 transition-all duration-300" />}
                </Link>

                {/* Submenu */}
                <AnimatePresence>
                  {link.submenu && activeSubmenu === link.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      className="absolute top-full left-0 mt-2 w-64 bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl shadow-primary/10 overflow-hidden py-2"
                    >
                      <div className="px-4 py-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{link.label} Options</span>
                      </div>
                      {link.submenu.map((item) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground/80 hover:text-primary hover:bg-primary/5 transition-all duration-200 group/item"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover/item:bg-primary transition-colors" />
                          {item.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3 xl:gap-4">
            <div className="flex items-center bg-secondary/30 rounded-full p-1 border border-border/40">
              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full hover:bg-background shadow-none transition-all hover:scale-110" onClick={() => navigate('/chat')} aria-label="Support">
                <HelpCircle className="w-5 h-5 text-foreground/70" />
              </Button>
              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full hover:bg-background shadow-none transition-all hover:scale-110" aria-label="Favorites">
                <Heart className="w-5 h-5 text-foreground/70" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full hover:bg-background shadow-none transition-all hover:scale-110 relative"
                onClick={() => navigate('/notifications')}
                aria-label={`${unreadCount} Unread notifications`}
              >
                <Bell className="w-5 h-5 text-foreground/70" />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-primary ring-2 ring-background animate-pulse" />
                )}
              </Button>
            </div>
            
            <div className="h-8 w-px bg-border/60 mx-1" />

            <Button 
              variant="outline" 
              className="gap-2 h-11 px-5 rounded-xl border-primary/20 hover:border-primary/50 hover:bg-primary/5 font-bold transition-all duration-300"
              onClick={() => navigate('/post-property')}
            >
              <Plus className="w-4.5 h-4.5 text-primary" />
              Post Property
            </Button>

            {user ? (
              <Button variant="default" className="h-11 px-6 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all" onClick={() => navigate('/profile')}>
                {user.profile.name.split(' ')[0]}
              </Button>
            ) : (
              <Button variant="default" className="h-11 px-6 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all" onClick={() => navigate('/login')}>
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile Actions (Visible on small screens) */}
          <div className="flex lg:hidden items-center gap-1 sm:gap-2 ml-auto">
            {user ? (
              <Button
                variant="default"
                size="sm"
                className="h-8 px-2 sm:px-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5"
                onClick={() => navigate('/profile')}
              >
                <span className="max-w-[70px] sm:max-w-[100px] truncate">
                  {user.profile.name}
                </span>
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider shadow-sm"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="relative touch-friendly shrink-0 h-9 w-9"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="w-5 h-5" />
              {unreadCount && unreadCount > 0 ? (
                <span className="absolute top-2 right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-white ring-1 ring-card">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
