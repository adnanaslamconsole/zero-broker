import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedProperties } from '@/components/home/FeaturedProperties';
import { ServicesSection } from '@/components/home/ServicesSection';
import { PopularCitiesSection } from '@/components/home/PopularCitiesSection';
import { WhyChooseUs } from '@/components/home/WhyChooseUs';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { SocietyManagement } from '@/components/home/SocietyManagement';
import { DownloadApp } from '@/components/home/DownloadApp';
import SEO from '@/components/common/SEO';
import { ShieldCheck, Sparkles, TrendingUp, MapPin } from 'lucide-react';
import { motion, useScroll, useSpring } from 'framer-motion';

const Index = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <SEO 
        title="Zero Broker | Buy, Rent & Sell Properties without Brokerage"
        description="India's leading zero brokerage platform. Find flats, houses, PGs, and commercial spaces without paying extra brokerage fees."
      />
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-[100]"
        style={{ scaleX }}
      />

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-b border-primary/20 py-2.5 relative overflow-hidden group">
        <motion.div 
          animate={{ x: [-100, 100], opacity: [0, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-40"
        />
        <div className="container flex items-center justify-center gap-3 text-primary font-bold text-xs sm:text-sm tracking-tight">
          <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          <span className="uppercase tracking-widest">Only Serious Visits Allowed. ₹99 Refundable Visit Token.</span>
        </div>
      </div>

      <Header />
      
      <main className="relative">
        {/* Background Decorative Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>

        <div className="relative z-10">
          <HeroSection />
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <FeaturedProperties />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-secondary/30 py-4 sm:py-8"
          >
            <PopularCitiesSection />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <ServicesSection />
          </motion.div>

          <WhyChooseUs />
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <SocietyManagement />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-primary/5"
          >
            <TestimonialsSection />
          </motion.div>

          <DownloadApp />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
