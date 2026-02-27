import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Building, 
  Users, 
  Shield, 
  CreditCard, 
  Bell, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  'Visitor Management',
  'Maintenance Billing',
  'Security Gate App',
  'Complaint System',
  'Accounting Reports',
  'Announcements',
];

export function SocietyManagement() {
  return (
    <section className="mobile-optimized-spacing overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center lg:text-left order-2 lg:order-1"
          >
            <span className="inline-block px-4 py-1.5 bg-accent/10 text-accent rounded-full text-xs sm:text-sm font-bold mb-4 sm:mb-6 tracking-wide uppercase">
              ZeroBrokerHood
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground mb-4 sm:mb-6 leading-tight">
              Complete Society Management Solution
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Transform your housing society with our comprehensive management platform. 
              From visitor tracking to maintenance billing, we've got everything covered.
            </p>

            {/* Feature List */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8 sm:mb-10 max-w-md mx-auto lg:mx-0">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm sm:text-base">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success shrink-0" />
                  <span className="text-foreground font-medium truncate">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start">
              <Button size="lg" asChild className="gap-2 h-12 sm:h-14 rounded-xl font-bold px-8 w-full sm:w-auto">
                <Link to="/society">
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="h-12 sm:h-14 rounded-xl font-bold px-8 w-full sm:w-auto">
                <Link to="/society/demo">Request Demo</Link>
              </Button>
            </div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative order-1 lg:order-2 mb-12 lg:mb-0"
          >
            <div className="relative bg-gradient-to-br from-accent/10 to-primary/10 rounded-3xl p-6 sm:p-8 lg:p-12 aspect-square lg:aspect-auto">
              {/* Floating Cards - Hidden on very small screens or repositioned */}
              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2 }}
                className="bg-card rounded-xl shadow-xl p-3 sm:p-4 absolute -top-4 sm:-top-6 left-4 sm:left-8 z-20 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Security Alert</p>
                    <p className="font-bold text-xs sm:text-sm">Visitor arrived at Gate 1</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2.5 }}
                className="bg-card rounded-xl shadow-xl p-3 sm:p-4 absolute -bottom-4 sm:-bottom-6 right-4 sm:right-8 z-20 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Maintenance</p>
                    <p className="font-bold text-xs sm:text-sm">Bill paid successfully</p>
                  </div>
                </div>
              </motion.div>

              {/* Central Visual Element */}
              <div className="w-full h-full bg-card/40 backdrop-blur-sm rounded-2xl border border-white/20 flex items-center justify-center">
                <Building className="w-24 h-24 sm:w-32 sm:h-32 text-accent/20" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
