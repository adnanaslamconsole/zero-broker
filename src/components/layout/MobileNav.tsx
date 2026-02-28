import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Search, 
  PlusSquare, 
  Heart, 
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { label: 'Home', icon: Home, href: '/' },
    { label: 'Search', icon: Search, href: '/properties' },
    { label: 'Post', icon: PlusSquare, href: '/post-property', primary: true },
    { label: 'Saved', icon: Heart, href: '/profile?tab=saved' },
    { label: 'Support', icon: HelpCircle, href: '/chat' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-colors",
                item.primary ? "relative -top-4" : "h-full"
              )}
            >
              {item.primary ? (
                <div className="w-12 h-12 rounded-2xl bg-primary shadow-lg shadow-primary/30 flex items-center justify-center text-primary-foreground transform transition-transform active:scale-95">
                  <item.icon className="w-6 h-6" />
                </div>
              ) : (
                <>
                  <item.icon className={cn(
                    "w-5 h-5 transition-all",
                    isActive ? "text-primary scale-110" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-[10px] font-medium transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </>
              )}
              {isActive && !item.primary && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
