import { motion } from 'framer-motion';
import { 
  UserCheck, 
  ShieldCheck, 
  Banknote, 
  Clock,
  Building,
  MessageCircle
} from 'lucide-react';

const features = [
  {
    icon: UserCheck,
    title: 'Direct Owner Connect',
    description: 'Talk directly to property owners. No middlemen involved.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Properties',
    description: 'All listings verified by our team for authenticity.',
  },
  {
    icon: Banknote,
    title: 'Zero Brokerage',
    description: 'Save lakhs on brokerage. 100% free for tenants.',
  },
  {
    icon: Clock,
    title: 'Quick Turnaround',
    description: 'Find and move into your new home in days, not weeks.',
  },
  {
    icon: Building,
    title: '10L+ Properties',
    description: 'Largest selection of properties across 30+ cities.',
  },
  {
    icon: MessageCircle,
    title: '24/7 Support',
    description: 'Our team is always here to help you find your home.',
  },
];

export function WhyChooseUs() {
  return (
    <section className="mobile-optimized-spacing bg-primary text-primary-foreground overflow-hidden">
      <div className="container mx-auto px-4 relative">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16 relative z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold">
            Why Choose ZeroBroker?
          </h2>
          <p className="text-sm sm:text-base text-primary-foreground/70 mt-4 leading-relaxed">
            India's fastest growing property platform with over 50 lakh happy customers
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 relative z-10">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group text-center p-4 rounded-2xl hover:bg-white/5 transition-colors"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300">
                <feature.icon className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{feature.title}</h3>
              <p className="text-sm text-primary-foreground/70 leading-relaxed max-w-[280px] mx-auto">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
