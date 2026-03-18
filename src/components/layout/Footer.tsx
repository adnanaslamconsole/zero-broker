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
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logError } from '@/lib/errors';

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
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .insert([{ email }]);

      if (error) {
        if (error.code === '23505') {
          toast.info('You are already subscribed!');
        } else {
          throw error;
        }
      } else {
        toast.success('Successfully subscribed to newsletter!');
        setIsSuccess(true);
        setEmail('');
      }
    } catch (error) {
      logError(error, { action: 'newsletter.subscribe' });
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#050505] text-white relative overflow-hidden border-t border-white/5">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] translate-x-1/2 translate-y-1/2" />

      {/* Newsletter Section - Premium High-Contrast Card */}
      <div className="relative z-10 border-b border-white/5">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto"
          >
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary to-primary/80 p-8 sm:p-16 shadow-2xl shadow-primary/20">
              {/* Decorative circles for the newsletter card */}
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 w-64 h-64 bg-black/10 rounded-full blur-3xl" />
              
              <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-3xl sm:text-5xl font-display font-black mb-6 tracking-tight leading-tight text-white">
                    Stay in the <span className="text-black/20">Loop</span>
                  </h3>
                  <p className="text-white/80 mb-0 text-lg sm:text-xl max-w-md font-medium">
                    Join 50,000+ people getting the best property deals and home service offers.
                  </p>
                </div>
                
                <form className="flex flex-col sm:flex-row gap-3 group" onSubmit={handleSubscribe}>
                  <div className="relative flex-1">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-white/80 transition-colors" />
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      disabled={isSubmitting || isSuccess}
                      className="h-16 pl-14 bg-white/10 border-white/10 text-white placeholder:text-white/40 focus:bg-white/15 focus:border-white/20 transition-all rounded-2xl border-2"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    size="lg" 
                    disabled={isSubmitting || isSuccess}
                    className="h-16 px-10 shrink-0 bg-white text-primary hover:bg-white/90 font-black uppercase tracking-widest rounded-2xl shadow-2xl shadow-black/20 group/btn border-none transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Subscribing...' : isSuccess ? 'Subscribed!' : 'Subscribe'}
                    <Send className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                  </Button>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-12 gap-y-16">
          {/* Brand Identity Section */}
          <div className="col-span-2 md:col-span-4 lg:col-span-2 space-y-10">
            <Link to="/" className="inline-flex items-center gap-4 group">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:scale-110 transition-all duration-500 group-hover:rotate-6">
                <Home className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-3xl font-display font-black tracking-tighter uppercase block leading-none">ZeroBroker</span>
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-primary mt-1 block">Reimagining Real Estate</span>
              </div>
            </Link>
            
            <p className="text-white/50 text-base leading-relaxed max-w-sm font-medium">
              India's most trusted direct-to-owner property platform. We're on a mission to make finding a home as easy as ordering a coffee.
            </p>
            
            <div className="grid gap-6">
              {[
                { icon: Phone, label: '+91 78977 73335', href: 'tel:+917897773335' },
                { icon: Mail, label: 'support@zerobroker.in', href: 'mailto:support@zerobroker.in' },
                { icon: MapPin, label: 'HSR Layout, Bangalore', href: null },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 group/contact w-fit">
                  <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center group-hover/contact:bg-primary/20 group-hover/contact:text-primary transition-all duration-300 border border-white/5">
                    <item.icon className="w-4.5 h-4.5" />
                  </div>
                  {item.href ? (
                    <a href={item.href} className="text-white/70 font-bold hover:text-primary transition-colors">{item.label}</a>
                  ) : (
                    <span className="text-white/70 font-bold">{item.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Links Grid */}
          {Object.entries(footerLinks).map(([title, links], idx) => (
            <motion.div 
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="space-y-8"
            >
              <h4 className="text-sm font-black uppercase tracking-[0.25em] text-white/30 border-l-2 border-primary/40 pl-4">{title}</h4>
              <ul className="space-y-5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-[15px] font-semibold text-white/50 hover:text-primary transition-all flex items-center gap-3 group/link"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -ml-5 group-hover/link:opacity-100 group-hover/link:ml-0 transition-all duration-300 text-primary" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Footer Bottom: Trust & Socials */}
        <div className="mt-24 pt-12 border-t border-white/5 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-12">
            <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.3em] text-center sm:text-left">
              © 2026 ZeroBroker. Future-Proof Real Estate.
            </p>
            <div className="flex items-center gap-8">
              {['Terms', 'Privacy', 'Sitemap'].map((item) => (
                <Link 
                  key={item}
                  to={`/${item.toLowerCase()}`} 
                  className="text-[11px] font-black uppercase tracking-widest text-white/20 hover:text-primary transition-colors"
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className={cn(
                  "w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center transition-all duration-500 group/social hover:bg-primary transition-colors border border-white/5",
                  "hover:scale-110 hover:-translate-y-1 shadow-lg hover:shadow-primary/20",
                )}
                aria-label={social.label}
              >
                <social.icon className="w-5 h-5 text-white/60 group-hover/social:text-white group-hover/social:scale-110 transition-all duration-500" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
