import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Button } from '@/components/ui/button';
import { sampleProperties } from '@/data/sampleProperties';

export function FeaturedProperties() {
  const featuredProperties = sampleProperties.filter(p => p.isFeatured || p.isPremium).slice(0, 6);

  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl lg:text-4xl font-display font-bold text-foreground">
              Featured Properties
            </h2>
            <p className="text-muted-foreground mt-2">
              Hand-picked properties by our team
            </p>
          </div>
          <Button variant="outline" asChild className="gap-2">
            <Link to="/properties">
              View All Properties
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProperties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <PropertyCard property={property} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
