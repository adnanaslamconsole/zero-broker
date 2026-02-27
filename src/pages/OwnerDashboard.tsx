import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { listProperties, updatePropertyListing } from '@/lib/mockApi';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Button } from '@/components/ui/button';

export default function OwnerDashboard() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['owner-properties'],
    queryFn: listProperties,
  });

  const mutation = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) =>
      updatePropertyListing(payload.id, { isActive: payload.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-10">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">Owner dashboard</h1>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data?.map((property) => (
              <div key={property.id} className="space-y-3">
                <PropertyCard property={property} />
                <div className="flex justify-between">
                  <div className="text-xs text-muted-foreground">
                    Views: {property.views} • Leads: {property.leads}
                  </div>
                  <Button
                    size="sm"
                    variant={property.isActive ? 'outline' : 'default'}
                    onClick={() =>
                      mutation.mutate({ id: property.id, isActive: !property.isActive })
                    }
                  >
                    {property.isActive ? 'Pause listing' : 'Activate listing'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
