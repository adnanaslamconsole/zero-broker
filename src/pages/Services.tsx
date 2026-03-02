import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Loader2, ArrowRight, Home } from 'lucide-react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function Services() {
  const { data: services, isLoading, error: queryError } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          service_categories (
            name,
            slug
          )
        `);
      if (error) throw error;
      return data;
    },
  });

  if (queryError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-foreground">Error loading services</h2>
            <p className="text-muted-foreground mb-6">We couldn't fetch the services list at this time.</p>
            <Button asChild>
              <Link to="/"><Home className="w-4 h-4 mr-2" /> Back to Home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Home Services</h1>
          <p className="text-muted-foreground mb-8">Professional services for all your home needs</p>
          
          <ErrorBoundary>
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {services?.map((service) => (
                  <div key={service.id} className="bg-card rounded-xl border border-border overflow-hidden flex flex-col group hover:shadow-lg transition-all duration-300">
                    <div className="aspect-video relative overflow-hidden">
                      <img 
                        src={service.image_url} 
                        alt={service.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                      <div className="absolute bottom-3 left-3 text-white font-medium">
                        {service.service_categories?.name || service.category?.replace('-', ' & ') || 'General Service'}
                      </div>
                    </div>
                    
                    <div className="p-5 flex flex-col flex-1">
                      <h2 className="font-semibold text-xl text-foreground mb-2">{service.name}</h2>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{service.description}</p>
                      
                      <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Starting at</p>
                          <p className="text-lg font-bold text-primary">₹{service.base_price}</p>
                        </div>
                        <Button asChild className="gap-2">
                          <Link to={`/services/${service.id}`}>
                            Book Now <ArrowRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ErrorBoundary>
        </div>
      </main>
      <Footer />
    </div>
  );
}
