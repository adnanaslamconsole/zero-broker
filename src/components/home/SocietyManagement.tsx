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
    <section className="py-16 lg:py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-4 py-1.5 bg-accent/10 text-accent rounded-full text-sm font-medium mb-4">
              ZeroBrokerHood
            </span>
            <h2 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-4">
              Complete Society Management Solution
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Transform your housing society with our comprehensive management platform. 
              From visitor tracking to maintenance billing, we've got everything covered.
            </p>

            {/* Feature List */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild className="gap-2">
                <Link to="/society">
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
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
            className="relative"
          >
            <div className="relative bg-gradient-to-br from-accent/10 to-primary/10 rounded-3xl p-8 lg:p-12">
              {/* Floating Cards */}
              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2 }}
                className="bg-card rounded-xl shadow-lg p-4 absolute -top-6 left-8"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Security Alert</p>
                    <p className="font-medium text-sm">Visitor arrived at Gate 1</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ repeat: Infinity, repeatType: 'reverse', duration: 2.5 }}
                className="bg-card rounded-xl shadow-lg p-4 absolute -bottom-6 right-8"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Maintenance</p>
                    <p className="font-medium text-sm">₹5,200 paid successfully</p>
                  </div>
                </div>
              </motion.div>

              {/* Main Visual */}
              <div className="bg-card rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building className="w-6 h-6" />
                    <span className="font-semibold">Palm Heights Society</span>
                  </div>
                  <Bell className="w-5 h-5" />
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-secondary rounded-lg p-4">
                      <p className="text-2xl font-bold text-foreground">124</p>
                      <p className="text-xs text-muted-foreground">Flats</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-4">
                      <p className="text-2xl font-bold text-foreground">89%</p>
                      <p className="text-xs text-muted-foreground">Paid</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-4">
                      <p className="text-2xl font-bold text-foreground">5</p>
                      <p className="text-xs text-muted-foreground">Open</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-success/5 rounded-lg border border-success/20">
                    <Users className="w-5 h-5 text-success" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Annual General Meeting</p>
                      <p className="text-xs text-muted-foreground">Sunday, 10 AM • Community Hall</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
