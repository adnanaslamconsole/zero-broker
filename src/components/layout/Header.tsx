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
  LayoutDashboard,
  Key,
  CreditCard,
  LogOut,
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
  const { user } = useAuth();
  const isAdmin = user?.profile?.roles?.includes('platform-admin');
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (label: string) => {
    setExpandedSection(expandedSection === label ? null : label);
  };

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

  const mobileNavLinks = [
    { label: 'Rent', href: '/properties?type=rent', icon: Building2 },
    { label: 'Buy', href: '/properties?type=sale', icon: Home },
    { label: 'Services', href: '/services', icon: Wrench },
    { label: 'Plans', href: '/plans', icon: Crown },
    { label: 'ZeroBrokerHood', href: '/society', icon: Building },
  ];

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
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
          <div className="flex lg:hidden items-center gap-1 sm:gap-2">
            {!user && (
              <Button
                variant="default"
                size="sm"
                className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider shadow-sm mr-1"
                onClick={() => navigate('/login')}
              >
                Login/Signup
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="relative touch-friendly"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="w-5 h-5" />
              {unreadCount && unreadCount > 0 ? (
                <span className="absolute top-2 right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-white ring-1 ring-card">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : null}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="touch-friendly"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9998] lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white z-[9999] lg:hidden shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-card/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl leading-none">Menu</h2>
                  <p className="text-xs text-muted-foreground mt-1">ZeroBroker Property</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-10 h-10 rounded-full hover:bg-secondary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="w-6 h-6 text-foreground/70" />
              </Button>
            </div>

            {/* User Profile Section */}
            <div className="p-6 bg-secondary/10 border-b border-border">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg shadow-primary/20 ring-4 ring-primary/10">
                    {user.profile?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-foreground truncate">{user.profile?.name || 'User'}</h3>
                    <p className="text-sm text-muted-foreground truncate">{user.profile?.email || ''}</p>
                    <button 
                      onClick={() => {
                        navigate('/profile');
                        setIsMobileMenuOpen(false);
                      }}
                      className="text-xs font-semibold text-primary mt-1 hover:underline flex items-center gap-1"
                    >
                      View Profile <ChevronDown className="w-3 h-3 rotate-[270deg]" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground border border-border/50">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Welcome Guest</h3>
                      <p className="text-sm text-muted-foreground">Login for the best experience</p>
                    </div>
                  </div>
                  <Button 
                    className="w-full h-11 rounded-xl shadow-lg shadow-primary/20"
                    onClick={() => {
                      navigate('/login');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    Login / Register
                  </Button>
                </div>
              )}
            </div>

            {/* Navigation Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar pb-32">
              <div className="px-4 py-2 bg-primary/10 rounded-lg text-sm font-medium text-primary mb-4">
                Navigation Menu
              </div>
              
              {/* Quick Access Section */}
              <div>
                <h4 className="px-4 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Quick Access</h4>
                <div className="grid grid-cols-1 gap-1">
                  {mobileNavLinks.map((link) => (
                    <Link
                      key={link.label}
                      to={link.href}
                      className="flex items-center gap-4 px-4 py-3.5 text-foreground font-semibold rounded-2xl hover:bg-secondary/70 transition-all group"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                        <link.icon className="w-5 h-5" />
                      </div>
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Core Services Section */}
              {navLinks.length > 0 && (
                <div>
                  <h4 className="px-4 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">All Categories</h4>
                  <div className="grid grid-cols-1 gap-1">
                    {navLinks.map((link) => (
                      <div key={link.label} className="space-y-1">
                        <button
                          className="flex items-center justify-between w-full px-4 py-3.5 text-foreground font-semibold rounded-2xl hover:bg-secondary/70 transition-all group"
                          onClick={() => link.submenu ? toggleSection(link.label) : (setIsMobileMenuOpen(false), navigate(link.href))}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                              <link.icon className="w-5 h-5" />
                            </div>
                            <span>{link.label}</span>
                          </div>
                          {link.submenu && (
                            <motion.div
                              animate={{ rotate: expandedSection === link.label ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="w-4 h-4 text-muted-foreground/50" />
                            </motion.div>
                          )}
                        </button>
                        {link.submenu && (
                          <AnimatePresence>
                            {expandedSection === link.label && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="overflow-hidden ml-14 grid grid-cols-1 gap-1 pb-2"
                              >
                                {link.submenu.map((item) => (
                                  <Link
                                    key={item.label}
                                    to={item.href}
                                    className="block px-3 py-2.5 text-[14px] text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-xl transition-colors border-l-2 border-transparent hover:border-primary/20 pl-4"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                  >
                                    {item.label}
                                  </Link>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User Dashboard Section (Logged In) */}
              {user && (
                <div>
                  <h4 className="px-4 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">User Dashboard</h4>
                  <div className="grid grid-cols-1 gap-1">
                    <Link
                      to={isAdmin ? "/admin" : "/owner/dashboard"}
                      className="flex items-center gap-4 px-4 py-3.5 text-foreground font-semibold rounded-2xl hover:bg-secondary/70 transition-all group"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                        <LayoutDashboard className="w-5 h-5" />
                      </div>
                      <span>{isAdmin ? "Admin Dashboard" : "Owner Dashboard"}</span>
                    </Link>
                    <Link
                      to="/post-property"
                      className="flex items-center gap-4 px-4 py-3.5 text-foreground font-semibold rounded-2xl hover:bg-secondary/70 transition-all group"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span>Post Property</span>
                    </Link>
                    <Link
                      to="/payments"
                      className="flex items-center gap-4 px-4 py-3.5 text-foreground font-semibold rounded-2xl hover:bg-secondary/70 transition-all group"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <span>My Payments</span>
                    </Link>
                    <Link
                      to="/agreements"
                      className="flex items-center gap-4 px-4 py-3.5 text-foreground font-semibold rounded-2xl hover:bg-secondary/70 transition-all group"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                        <Key className="w-5 h-5" />
                      </div>
                      <span>My Agreements</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Account & Support Section */}
              <div>
                <h4 className="px-4 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mb-3">Account & Support</h4>
                <div className="grid grid-cols-1 gap-1">
                  <Link
                    to="/plans"
                    className="flex items-center gap-4 px-4 py-3.5 text-foreground font-semibold rounded-2xl hover:bg-secondary/70 transition-all group"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                      <Crown className="w-5 h-5" />
                    </div>
                    <span>Subscription Plans</span>
                  </Link>
                  <Link
                    to="/society"
                    className="flex items-center gap-4 px-4 py-3.5 text-foreground font-semibold rounded-2xl hover:bg-secondary/70 transition-all group"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                      <Building className="w-5 h-5" />
                    </div>
                    <span>ZeroBrokerHood</span>
                  </Link>
                  <Link
                    to="/notifications"
                    className="flex items-center justify-between px-4 py-3.5 text-foreground font-semibold rounded-2xl hover:bg-secondary/70 transition-all group"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                        <Bell className="w-5 h-5" />
                      </div>
                      <span>Notifications</span>
                    </div>
                    {unreadCount && unreadCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-destructive text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    ) : null}
                  </Link>
                  <Link
                    to="/shortlist"
                    className="flex items-center gap-4 px-4 py-3.5 text-foreground font-semibold rounded-2xl hover:bg-secondary/70 transition-all group"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                      <Heart className="w-5 h-5" />
                    </div>
                    <span>Shortlisted</span>
                  </Link>
                  <Link
                    to="/chat"
                    className="flex items-center gap-4 px-4 py-3.5 text-foreground font-semibold rounded-2xl hover:bg-secondary/70 transition-all group"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <span>Messages</span>
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-4 px-4 py-3.5 text-primary font-bold rounded-2xl hover:bg-primary/5 transition-all group border border-primary/20"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <span>Admin Dashboard</span>
                    </Link>
                  )}
                  {user && (
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setIsMobileMenuOpen(false);
                        navigate('/');
                      }}
                      className="flex items-center gap-4 px-4 py-3.5 text-destructive font-semibold rounded-2xl hover:bg-destructive/5 transition-all group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground group-hover:text-destructive group-hover:bg-destructive/5 transition-colors">
                        <LogOut className="w-5 h-5" />
                      </div>
                      <span>Logout</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-border bg-card/80 backdrop-blur-md space-y-3 shrink-0">
              <Button
                variant="outline"
                className="w-full h-14 gap-3 rounded-2xl border-2 text-base font-bold shadow-sm hover:bg-secondary/50 transition-all active:scale-[0.98]"
                onClick={() => {
                  navigate('/post-property');
                  setIsMobileMenuOpen(false);
                }}
              >
                <Plus className="w-5 h-5" />
                Post Property Free
              </Button>
              {user && (
                <Button
                  variant="ghost"
                  className="w-full h-12 rounded-xl text-destructive hover:bg-destructive/5 font-semibold transition-all"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setIsMobileMenuOpen(false);
                    navigate('/');
                  }}
                >
                  Logout
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
