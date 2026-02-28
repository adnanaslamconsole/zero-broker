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
import { LocationDetector } from '@/components/common/LocationDetector';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary/10 border-b border-primary/20 py-2">
        <div className="container flex items-center justify-center gap-2 text-primary font-medium text-sm sm:text-base">
          <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Only Serious Visits Allowed. ₹99 Refundable Visit Token.</span>
        </div>
      </div>
      <LocationDetector />
      <Header />
      <main>
        <HeroSection />
        <FeaturedProperties />
        <PopularCitiesSection />
        <ServicesSection />
        <WhyChooseUs />
        <SocietyManagement />
        <TestimonialsSection />
        <DownloadApp />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
