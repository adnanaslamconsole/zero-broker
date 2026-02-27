import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { popularCities } from '@/data/sampleProperties';

export function PopularCitiesSection() {
  const cityImages = [
    'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400', // Bangalore
    'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400', // Mumbai
    'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400', // Delhi
    'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400', // Chennai
    'https://images.unsplash.com/photo-1551161242-b5af797b7233?w=400', // Hyderabad
    'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=400', // Pune
    'https://images.unsplash.com/photo-1558431382-27e303142255?w=400', // Kolkata
    'https://images.unsplash.com/photo-1595658658481-d53d3f999875?w=400', // Ahmedabad
  ];

  return (
    <section className="py-16 lg:py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl lg:text-4xl font-display font-bold text-foreground">
            Explore Properties in Top Cities
          </h2>
          <p className="text-muted-foreground mt-3">
            Find your perfect home in India's most sought-after cities
          </p>
        </div>

        {/* Cities Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {popularCities.map((city, index) => (
            <motion.div
              key={city.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <Link
                to={`/properties?q=${city.name}`}
                className="group relative block aspect-[4/3] rounded-xl overflow-hidden"
              >
                <img
                  src={cityImages[index]}
                  alt={city.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-semibold text-white">{city.name}</h3>
                  <p className="flex items-center gap-1.5 text-sm text-white/80 mt-1">
                    <TrendingUp className="w-4 h-4" />
                    {city.count.toLocaleString()}+ properties
                  </p>
                </div>
                <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
