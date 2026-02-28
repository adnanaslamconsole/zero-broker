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
  MessageCircle,
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
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user && !user.profile.isDemo,
    refetchInterval: 30000, // Poll every 30s
  });

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center transition-transform group-hover:scale-105">
              <Home className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-display font-bold text-foreground leading-none">ZeroBroker</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Zero Brokerage</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative group"
                onMouseEnter={() => setActiveSubmenu(link.label)}
                onMouseLeave={() => setActiveSubmenu(null)}
              >
                <Link
                  to={link.href}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground rounded-lg hover:bg-secondary transition-all"
                >
                  <link.icon className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                  {link.label}
                  {link.submenu && <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
                </Link>

                {/* Submenu */}
                <AnimatePresence>
                  {link.submenu && activeSubmenu === link.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute top-full left-0 mt-1 w-56 bg-card rounded-xl border border-border shadow-xl overflow-hidden py-1.5"
                    >
                      {link.submenu.map((item) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          className="block px-4 py-2 text-sm text-foreground/80 hover:text-foreground hover:bg-secondary transition-colors"
                        >
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
          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            <Button variant="ghost" size="icon" className="relative touch-friendly" onClick={() => navigate('/chat')}>
              <MessageCircle className="w-5 h-5" />
            </Button>
            
            {isAdmin && (
              <Button variant="ghost" className="text-primary font-semibold h-10 px-4" onClick={() => navigate('/admin')}>
                <ShieldCheck className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}

            <Button variant="ghost" size="icon" className="relative touch-friendly">
              <Heart className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative touch-friendly"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="w-5 h-5" />
              {unreadCount && unreadCount > 0 ? (
                <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white ring-2 ring-card">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 h-10 px-4"
              onClick={() => navigate('/post-property')}
            >
              <Plus className="w-4 h-4" />
              Post Property
            </Button>
            {user ? (
              <Button variant="default" className="h-10 px-4" onClick={() => navigate('/profile')}>
                {user.profile.name}
              </Button>
            ) : (
              <Button variant="default" className="h-10 px-4" onClick={() => navigate('/login')}>
                Login / Register
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
