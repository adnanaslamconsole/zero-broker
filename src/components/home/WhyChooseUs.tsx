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
    <section className="mobile-optimized-spacing bg-primary text-primary-foreground overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 50, 0] 
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-[100px]"
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
            x: [0, -50, 0] 
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-24 -left-24 w-96 h-96 bg-accent rounded-full blur-[100px]"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-[0.2em] mb-6"
          >
            The ZeroBroker Advantage
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl lg:text-6xl font-display font-black tracking-tight leading-[1.1]"
          >
            Why millions choose <span className="text-accent-foreground underline decoration-accent/30 underline-offset-8">ZeroBroker</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-base sm:text-xl text-primary-foreground/80 mt-8 leading-relaxed font-medium"
          >
            We've revolutionized real estate by removing middlemen and building trust through transparency.
          </motion.p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-x-12 lg:gap-y-16">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-8">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2.5rem] bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl group-hover:bg-white group-hover:text-primary transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                  >
                    <feature.icon className="w-10 h-10 sm:w-12 sm:h-12 transition-transform duration-500" />
                  </motion.div>
                  {/* Decorative Number */}
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent text-accent-foreground text-xs font-black flex items-center justify-center border-4 border-primary shadow-lg">
                    0{index + 1}
                  </span>
                </div>
                
                <h3 className="text-xl sm:text-2xl font-black mb-4 group-hover:text-accent transition-colors tracking-tight">{feature.title}</h3>
                <p className="text-base text-primary-foreground/70 leading-relaxed font-medium">
                  {feature.description}
                </p>
                
                {/* Hover Indicator */}
                <div className="mt-6 w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "0%" }}
                    className="w-full h-full bg-accent"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA Section */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 p-8 sm:p-12 rounded-[3rem] bg-gradient-to-br from-white/10 to-transparent border border-white/10 backdrop-blur-md text-center"
        >
          <h3 className="text-2xl sm:text-3xl font-black mb-6">Ready to save thousands on your next move?</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="px-8 py-4 bg-white text-primary font-black rounded-2xl hover:bg-accent hover:text-accent-foreground transition-all duration-300 shadow-xl shadow-black/10 active:scale-95">
              Get Started Now
            </button>
            <button className="px-8 py-4 bg-primary-foreground/10 text-white font-black rounded-2xl hover:bg-white/20 transition-all border border-white/20 active:scale-95">
              Learn More
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
