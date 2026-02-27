import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const testimonials = [
  {
    id: 1,
    name: 'Priya Sharma',
    role: 'Software Engineer',
    location: 'Bangalore',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    rating: 5,
    text: 'Found my dream apartment in Koramangala within a week! Saved ₹50,000 on brokerage. The verification process gave me complete peace of mind.',
  },
  {
    id: 2,
    name: 'Rahul Verma',
    role: 'Product Manager',
    location: 'Mumbai',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    rating: 5,
    text: 'The packers and movers service was seamless. Everything was handled professionally. Highly recommend ZeroBroker for anyone relocating!',
  },
  {
    id: 3,
    name: 'Anjali Patel',
    role: 'Business Owner',
    location: 'Chennai',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    rating: 5,
    text: 'As a property owner, listing on ZeroBroker helped me find genuine tenants quickly. The rental agreement service was super convenient.',
  },
  {
    id: 4,
    name: 'Vikram Singh',
    role: 'Doctor',
    location: 'Delhi',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    rating: 5,
    text: 'Bought my first home through ZeroBroker. The process was transparent and the legal documentation support was excellent.',
  },
];

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="mobile-optimized-spacing bg-secondary/30 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground">
            Loved by 50 Lakh+ Customers
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-4 leading-relaxed">
            Don't just take our word for it. Here's what our customers have to say.
          </p>
        </div>

        {/* Testimonial Carousel */}
        <div className="relative max-w-4xl mx-auto">
          {/* Desktop Navigation Buttons */}
          <div className="absolute top-1/2 -left-4 lg:-left-20 -translate-y-1/2 z-10 hidden sm:block">
            <Button
              variant="outline"
              size="icon"
              onClick={prev}
              className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </div>
          <div className="absolute top-1/2 -right-4 lg:-right-20 -translate-y-1/2 z-10 hidden sm:block">
            <Button
              variant="outline"
              size="icon"
              onClick={next}
              className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="bg-card rounded-3xl p-6 sm:p-10 lg:p-14 shadow-xl border border-border/50 relative overflow-hidden"
            >
              {/* Decoration */}
              <Quote className="absolute top-6 right-6 sm:top-10 sm:right-10 w-16 h-16 sm:w-24 sm:h-24 text-accent/5 pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex gap-1 mb-6 sm:mb-8 justify-center sm:justify-start">
                  {Array.from({ length: testimonials[currentIndex].rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 sm:w-6 sm:h-6 fill-warning text-warning" />
                  ))}
                </div>

                <p className="text-lg sm:text-xl lg:text-2xl text-foreground leading-relaxed mb-8 sm:mb-10 font-medium italic text-center sm:text-left">
                  "{testimonials[currentIndex].text}"
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 border-t border-border/50 pt-8 sm:pt-10">
                  <img
                    src={testimonials[currentIndex].image}
                    alt={testimonials[currentIndex].name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-accent/10"
                  />
                  <div className="text-center sm:text-left">
                    <h4 className="font-bold text-lg sm:text-xl text-foreground">
                      {testimonials[currentIndex].name}
                    </h4>
                    <p className="text-sm sm:text-base text-muted-foreground font-medium">
                      {testimonials[currentIndex].role} <span className="hidden sm:inline mx-1">•</span> <br className="sm:hidden" /> {testimonials[currentIndex].location}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Dots (Always visible for mobile, desktop can use buttons or dots) */}
          <div className="flex justify-center gap-3 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-300",
                  currentIndex === index 
                    ? "bg-accent w-8" 
                    : "bg-accent/20"
                )}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
