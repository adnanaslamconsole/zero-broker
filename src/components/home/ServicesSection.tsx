import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Truck, 
  Paintbrush, 
  SprayCan, 
  Hammer, 
  Sofa,
  FileText,
  ArrowRight,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const services = [
  {
    id: 'packers-movers',
    title: 'Packers & Movers',
    description: 'Hassle-free relocation with verified partners',
    icon: Truck,
    color: 'bg-blue-500',
    rating: 4.8,
    reviews: '12K+',
  },
  {
    id: 'painting',
    title: 'Painting',
    description: 'Transform your home with professional painters',
    icon: Paintbrush,
    color: 'bg-orange-500',
    rating: 4.7,
    reviews: '8K+',
  },
  {
    id: 'cleaning',
    title: 'Home Cleaning',
    description: 'Deep cleaning services for your home',
    icon: SprayCan,
    color: 'bg-green-500',
    rating: 4.9,
    reviews: '15K+',
  },
  {
    id: 'repairs',
    title: 'Home Repairs',
    description: 'Plumbing, electrical & carpentry services',
    icon: Hammer,
    color: 'bg-purple-500',
    rating: 4.6,
    reviews: '6K+',
  },
  {
    id: 'furniture',
    title: 'Furniture Rental',
    description: 'Rent quality furniture at affordable prices',
    icon: Sofa,
    color: 'bg-pink-500',
    rating: 4.5,
    reviews: '4K+',
  },
  {
    id: 'rental-agreement',
    title: 'Rental Agreement',
    description: 'Legal rental agreements with e-stamp',
    icon: FileText,
    color: 'bg-teal-500',
    rating: 4.8,
    reviews: '20K+',
  },
];

export function ServicesSection() {
  return (
    <section className="mobile-optimized-spacing bg-secondary/50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground">
            Home Services
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-3">
            Everything you need to settle into your new home, all in one place
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Link
                to={`/services/${service.id}`}
                className="group block bg-card rounded-2xl border border-border p-5 sm:p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-current/10',
                    service.color
                  )}>
                    <service.icon className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground group-hover:text-accent transition-colors leading-tight">
                      {service.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                      {service.description}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-[10px] sm:text-sm">
                      <span className="flex items-center gap-1 text-warning font-medium">
                        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                        {service.rating}
                      </span>
                      <span className="text-muted-foreground">
                        {service.reviews} reviews
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-10 sm:mt-12">
          <Button variant="default" size="lg" asChild className="gap-2 h-12 sm:h-14 px-8 rounded-xl font-bold">
            <Link to="/services">
              Explore All Services
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
