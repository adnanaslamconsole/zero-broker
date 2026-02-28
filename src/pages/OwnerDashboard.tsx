import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { listProperties, updatePropertyListing } from '@/lib/mockApi';
import { PropertyCard } from '@/components/property/PropertyCard';
import { TokenTrackingDashboard } from '@/components/property/TokenTrackingDashboard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Payment } from '@/types/payments';

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

  const { data: tokenPayments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['owner-token-payments', user?.profile?.id],
    queryFn: async () => {
      if (!user) return [];

      // For demo purposes, if no real payments, provide mock data
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('ownerId', user.profile.id)
        .eq('purpose', 'site-visit-token');

      if (error || !payments?.length) {
        // Return some high-quality mock data for the dashboard demo
        return [
          {
            id: 'pay_1',
            userId: 'tenant_1',
            ownerId: user.profile.id,
            amount: 99,
            currency: 'INR',
            method: 'upi',
            status: 'success',
            purpose: 'site-visit-token',
            referenceId: 'BK-2026-03-01',
            gateway: 'razorpay',
            gatewayTransactionId: 'pay_Okw9S2K8L1',
            escrowStatus: 'held',
            auditTrail: [
              { timestamp: new Date().toISOString(), action: 'Payment Initiated', actorId: 'tenant_1', details: 'UPI Payment' },
              { timestamp: new Date().toISOString(), action: 'Escrow Locked', actorId: 'system', details: 'Funds held in IDFC Escrow' }
            ],
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'pay_2',
            userId: 'tenant_2',
            ownerId: user.profile.id,
            amount: 99,
            currency: 'INR',
            method: 'card',
            status: 'success',
            purpose: 'site-visit-token',
            referenceId: 'BK-2026-02-28',
            gateway: 'razorpay',
            gatewayTransactionId: 'pay_P1m2N3B4V5',
            escrowStatus: 'released',
            auditTrail: [
              { timestamp: new Date(Date.now() - 86400000).toISOString(), action: 'Payment Received', actorId: 'tenant_2', details: 'Visa Card' },
              { timestamp: new Date().toISOString(), action: 'Escrow Released', actorId: 'system', details: 'Visit confirmed by OTP' }
            ],
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ] as Payment[];
      }

      return payments as Payment[];
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
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-display font-black text-foreground">Owner Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage your properties and track token bookings</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-xl font-bold">Settings</Button>
              <Button className="rounded-xl font-bold shadow-lg shadow-primary/20">Post Property</Button>
            </div>
          </div>

          <Tabs defaultValue="listings" className="space-y-8">
            <TabsList className="bg-secondary/20 p-1 rounded-2xl border border-border/50 h-12 w-full md:w-auto">
              <TabsTrigger value="listings" className="rounded-xl font-bold px-8 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                Active Listings
              </TabsTrigger>
              <TabsTrigger value="bookings" className="rounded-xl font-bold px-8 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                Token Bookings
              </TabsTrigger>
              <TabsTrigger value="leads" className="rounded-xl font-bold px-8 h-10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                Leads
              </TabsTrigger>
            </TabsList>

            <TabsContent value="listings" className="mt-0">
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {isLoading ? (
                  [1, 2, 3].map(i => <div key={i} className="h-[400px] bg-muted rounded-3xl animate-pulse" />)
                ) : data?.length ? (
                  data?.map((property) => (
                    <div key={property.id} className="space-y-4 group">
                      <PropertyCard property={property} />
                      <div className="bg-secondary/20 rounded-2xl p-4 flex justify-between items-center border border-border/50 group-hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Views</span>
                            <span className="text-lg font-black">{property.views || 0}</span>
                          </div>
                          <div className="w-px h-8 bg-border/50" />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Leads</span>
                            <span className="text-lg font-black">{property.leads || 0}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={property.is_available ? 'outline' : 'default'}
                          className="rounded-xl font-bold px-4 h-10"
                          onClick={() =>
                            mutation.mutate({ id: property.id, isActive: !property.is_available })
                          }
                        >
                          {property.is_available ? 'Pause listing' : 'Activate listing'}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-secondary/30 rounded-full flex items-center justify-center mx-auto">
                      <Building2 className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">No properties listed yet</h3>
                      <p className="text-muted-foreground max-w-xs mx-auto">Start by listing your property and find verified tenants faster.</p>
                    </div>
                    <Button className="rounded-xl font-bold h-12 px-8">List Now</Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="bookings" className="mt-0">
              <TokenTrackingDashboard 
                payments={tokenPayments || []} 
                isLoading={isLoadingPayments} 
              />
            </TabsContent>

            <TabsContent value="leads" className="mt-0">
              <div className="bg-card rounded-3xl border border-border shadow-xl p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <ArrowUpRight className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">Lead Management Coming Soon</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We are building a powerful lead tracking system to help you manage inquiries from potential tenants directly.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
