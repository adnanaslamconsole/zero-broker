import { Link } from 'react-router-dom';
import { 
  Home, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Youtube,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const footerLinks = {
  'Properties': [
    { label: 'Rent in Bangalore', href: '/properties?city=bangalore&type=rent' },
    { label: 'Buy in Mumbai', href: '/properties?city=mumbai&type=sale' },
    { label: 'PG in Delhi', href: '/properties?city=delhi&type=rent&property=pg' },
    { label: 'Commercial Space', href: '/properties?type=rent&property=commercial' },
  ],
  'Services': [
    { label: 'Packers & Movers', href: '/services/packers-movers' },
    { label: 'Home Cleaning', href: '/services/cleaning' },
    { label: 'Painting Services', href: '/services/painting' },
    { label: 'Rental Agreement', href: '/services/rental-agreement' },
  ],
  'Company': [
    { label: 'About Us', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Blog', href: '/blog' },
    { label: 'Press', href: '/press' },
  ],
  'Support': [
    { label: 'Help Center', href: '/help-center' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
};

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Youtube, href: '#', label: 'YouTube' },
];

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Newsletter Section */}
      <div className="border-b border-primary-foreground/10">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl font-display font-bold mb-2">Stay Updated</h3>
            <p className="text-primary-foreground/70 mb-6">
              Get the latest properties and exclusive offers directly in your inbox
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
              />
              <Button variant="hero" className="shrink-0">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Logo & Info */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-foreground flex items-center justify-center">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-xl font-display font-bold">ZeroBroker</span>
                <span className="text-xs block text-primary-foreground/70 -mt-1">Zero Brokerage</span>
              </div>
            </Link>
            <p className="text-primary-foreground/70 text-sm mb-6 max-w-xs">
              India's #1 property platform connecting owners directly to tenants and buyers. 
              Save on brokerage with verified listings.
            </p>
            <div className="space-y-2 text-sm">
              <a href="tel:+919876543210" className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Phone className="w-4 h-4" />
                +91 98765 43210
              </a>
              <a href="mailto:support@zerobroker.in" className="flex items-center gap-2 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Mail className="w-4 h-4" />
                support@zerobroker.in
              </a>
              <p className="flex items-center gap-2 text-primary-foreground/70">
                <MapPin className="w-4 h-4" />
                Bangalore, India
              </p>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold mb-4">{title}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-primary-foreground/60">
            © 2026 ZeroBroker. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                aria-label={social.label}
              >
                <social.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
