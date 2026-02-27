import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Search, 
  Building2, 
  User, 
  Menu, 
  X, 
  ChevronDown,
  Heart,
  Bell,
  Plus,
  ShieldCheck,
  Briefcase,
  Building,
  Wrench,
  Crown,
  MessageCircle,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const { user } = useAuth();
  const isAdmin = user?.profile?.roles?.includes('platform-admin');

  // Fetch unread notifications count
  const { data: unreadCount } = useQuery({
    queryKey: ['unread-notifications-count', user?.profile?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.profile.id)
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Poll every 30s
  });

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Home className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-display font-bold text-foreground">ZeroBroker</span>
              <span className="text-xs block text-muted-foreground -mt-1">Zero Brokerage</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => setActiveSubmenu(link.label)}
                onMouseLeave={() => setActiveSubmenu(null)}
              >
                <Link
                  to={link.href}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                  {link.submenu && <ChevronDown className="w-3.5 h-3.5" />}
                </Link>

                {/* Submenu */}
                <AnimatePresence>
                  {link.submenu && activeSubmenu === link.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-1 w-48 bg-card rounded-xl border border-border shadow-xl overflow-hidden"
                    >
                      {link.submenu.map((item) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          className="block px-4 py-2.5 text-sm text-foreground/80 hover:text-foreground hover:bg-secondary transition-colors"
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
          <div className="hidden lg:flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/chat')}>
              <MessageCircle className="w-5 h-5" />
            </Button>
            
            {isAdmin && (
              <Button variant="ghost" className="text-primary font-semibold" onClick={() => navigate('/admin')}>
                <ShieldCheck className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}

            <Button variant="ghost" size="icon" className="relative">
              <Heart className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="w-5 h-5" />
              {unreadCount && unreadCount > 0 ? (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => navigate('/post-property')}
            >
              <Plus className="w-4 h-4" />
              Post Property
            </Button>
            {user ? (
              <Button variant="default" onClick={() => navigate('/profile')}>
                {user.profile.name}
              </Button>
            ) : (
              <Button variant="default" onClick={() => navigate('/login')}>
                Login / Register
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-card border-t border-border overflow-hidden"
          >
            <div className="container mx-auto px-4 py-4 space-y-4">
              {navLinks.map((link) => (
                <div key={link.label}>
                  <Link
                    to={link.href}
                    className="flex items-center gap-3 px-4 py-3 text-foreground font-medium rounded-lg hover:bg-secondary transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <link.icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                  {link.submenu && (
                    <div className="ml-12 mt-1 space-y-1">
                      {link.submenu.map((item) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          className="block py-2 text-sm text-muted-foreground hover:text-foreground"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-3 px-4 py-3 text-primary font-bold rounded-lg hover:bg-secondary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <ShieldCheck className="w-5 h-5" />
                  Admin Dashboard
                </Link>
              )}

              <div className="pt-4 border-t border-border space-y-3">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    navigate('/post-property');
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Post Property Free
                </Button>
                <Button
                  className="w-full"
                  onClick={() => {
                    navigate('/login');
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Login / Register
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
