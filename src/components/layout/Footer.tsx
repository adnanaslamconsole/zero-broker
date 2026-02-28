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
  MapPin,
  Send,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  { icon: Facebook, href: '#', label: 'Facebook', color: 'hover:text-[#1877F2]' },
  { icon: Twitter, href: '#', label: 'Twitter', color: 'hover:text-[#1DA1F2]' },
  { icon: Instagram, href: '#', label: 'Instagram', color: 'hover:text-[#E4405F]' },
  { icon: Linkedin, href: '#', label: 'LinkedIn', color: 'hover:text-[#0A66C2]' },
  { icon: Youtube, href: '#', label: 'YouTube', color: 'hover:text-[#FF0000]' },
];

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent" />
      <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />

      {/* Newsletter Section */}
      <div className="border-b border-primary-foreground/10 relative z-10">
        <div className="container mx-auto px-4 py-16 sm:py-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h3 className="text-3xl sm:text-4xl font-display font-bold mb-4 tracking-tight">Stay in the Loop</h3>
            <p className="text-primary-foreground/70 mb-8 text-lg max-w-xl mx-auto">
              Join 50,000+ people getting the best property deals and home service offers directly in their inbox.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto group" onSubmit={(e) => e.preventDefault()}>
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-foreground/40 group-focus-within:text-primary-foreground/60 transition-colors" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  className="h-14 pl-12 bg-primary-foreground/5 border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 focus:bg-primary-foreground/10 focus:border-primary-foreground/20 transition-all rounded-2xl"
                />
              </div>
              <Button size="lg" className="h-14 px-8 shrink-0 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-black/20 group/btn">
                Subscribe
                <Send className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
              </Button>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16 sm:py-20 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-8 gap-y-12">
          {/* Logo & Info */}
          <div className="col-span-2 md:col-span-4 lg:col-span-2 space-y-8">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-primary-foreground flex items-center justify-center shadow-2xl shadow-black/20 group-hover:scale-110 transition-transform duration-500">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <div>
                <span className="text-2xl font-display font-black tracking-tighter uppercase block">ZeroBroker</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground/50 -mt-1 block">Property Reimagined</span>
              </div>
            </Link>
            
            <p className="text-primary-foreground/60 text-base leading-relaxed max-w-sm">
              India's most trusted direct-to-owner property platform. We're on a mission to make finding a home as easy as ordering a coffee.
            </p>
            
            <div className="space-y-4">
              <a href="tel:+919876543210" className="flex items-center gap-3 text-primary-foreground/70 hover:text-primary-foreground transition-all group/contact w-fit">
                <div className="w-10 h-10 rounded-xl bg-primary-foreground/5 flex items-center justify-center group-hover/contact:bg-primary-foreground/10 transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="font-bold">+91 98765 43210</span>
              </a>
              <a href="mailto:support@zerobroker.in" className="flex items-center gap-3 text-primary-foreground/70 hover:text-primary-foreground transition-all group/contact w-fit">
                <div className="w-10 h-10 rounded-xl bg-primary-foreground/5 flex items-center justify-center group-hover/contact:bg-primary-foreground/10 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="font-bold">support@zerobroker.in</span>
              </a>
              <div className="flex items-center gap-3 text-primary-foreground/70 w-fit">
                <div className="w-10 h-10 rounded-xl bg-primary-foreground/5 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="font-bold">HSR Layout, Bangalore</span>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links], idx) => (
            <motion.div 
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary-foreground/40 mb-8">{title}</h4>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm font-medium text-primary-foreground/70 hover:text-primary-foreground transition-all flex items-center gap-2 group/link"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground/10 group-hover/link:bg-primary-foreground transition-colors" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-20 pt-10 border-t border-primary-foreground/10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <p className="text-xs font-bold text-primary-foreground/40 uppercase tracking-widest">
              © 2026 ZeroBroker. Built for the future of real estate.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/terms" className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/30 hover:text-primary-foreground/60 transition-colors">Terms</Link>
              <Link to="/privacy" className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/30 hover:text-primary-foreground/60 transition-colors">Privacy</Link>
              <Link to="/sitemap" className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/30 hover:text-primary-foreground/60 transition-colors">Sitemap</Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className={cn(
                  "w-12 h-12 rounded-2xl bg-primary-foreground/5 flex items-center justify-center transition-all duration-300 group/social hover:bg-primary-foreground/10 hover:scale-110",
                  social.color
                )}
                aria-label={social.label}
              >
                <social.icon className="w-5 h-5 transition-transform duration-500 group-hover/social:rotate-[360deg]" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
