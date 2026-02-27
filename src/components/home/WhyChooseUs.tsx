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
    <section className="py-16 lg:py-24 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl lg:text-4xl font-display font-bold">
            Why Choose ZeroBroker?
          </h2>
          <p className="text-primary-foreground/70 mt-3">
            India's fastest growing property platform with over 50 lakh happy customers
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary-foreground/10 flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-primary-foreground/70 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
