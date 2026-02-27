import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <section className="py-16 lg:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl lg:text-4xl font-display font-bold text-foreground">
            Loved by 50 Lakh+ Customers
          </h2>
          <p className="text-muted-foreground mt-3">
            Don't just take our word for it. Here's what our customers have to say.
          </p>
        </div>

        {/* Testimonial Carousel */}
        <div className="relative max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="bg-card rounded-2xl p-8 lg:p-12 shadow-lg border border-border"
            >
              <Quote className="w-12 h-12 text-accent/20 mb-6" />
              <p className="text-lg lg:text-xl text-foreground leading-relaxed mb-8">
                "{testimonials[currentIndex].text}"
              </p>
              <div className="flex items-center gap-4">
                <img
                  src={testimonials[currentIndex].image}
                  alt={testimonials[currentIndex].name}
                  className="w-14 h-14 rounded-full object-cover"
                />
                <div>
                  <h4 className="font-semibold text-foreground">
                    {testimonials[currentIndex].name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {testimonials[currentIndex].role} • {testimonials[currentIndex].location}
                  </p>
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: testimonials[currentIndex].rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={prev}
              className="rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-accent' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={next}
              className="rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
