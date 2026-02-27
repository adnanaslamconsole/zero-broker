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

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
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
