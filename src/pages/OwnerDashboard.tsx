import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { listProperties, updatePropertyListing } from '@/lib/mockApi';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['owner-properties', user?.profile?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch from Supabase for all logged in users
      const { data: properties, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching owner properties:', error);
        // Fallback to mock for non-demo users if needed, 
        // but for demo user we definitely want their real posts.
        if (!user.profile.isDemo) {
          return listProperties();
        }
        return [];
      }

      return properties || [];
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (payload: { id: string; isActive: boolean }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('properties')
        .update({ is_available: payload.isActive })
        .eq('id', payload.id)
        .eq('owner_id', user.profile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Property status updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update property: ' + error.message);
    }
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
