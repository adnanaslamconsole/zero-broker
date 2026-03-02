import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getUserFriendlyErrorMessage, logError } from '@/lib/errors';

interface PricingPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  is_recommended: boolean;
  max_listings: number | null;
  highlight_listings: boolean;
  priority_support: boolean;
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
}

export default function Plans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: plans } = useQuery({
    queryKey: ['pricing-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .order('price_monthly', { ascending: true });
      if (error) throw error;
      return data as PricingPlan[];
    },
  });

  const { data: subscription } = useQuery({
    queryKey: ['user-subscription', user?.profile?.id],
    queryFn: async () => {
      if (!user || user.profile.isDemo) return null;
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.profile.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return (data as UserSubscription) || null;
    },
    enabled: !!user && !user.profile.isDemo,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (plan: PricingPlan) => {
      if (!user) throw new Error('Please login to subscribe');
      
      // Handle demo user
      if (user.profile.isDemo) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return;
      }

      const payload = {
        user_id: user.profile.id,
        plan_id: plan.id,
        status: 'active',
      };
      if (subscription) {
        const { error } = await supabase
          .from('user_subscriptions')
          .update(payload)
          .eq('id', subscription.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_subscriptions').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (!user?.profile.isDemo) {
        queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      }
      toast.success('Your plan has been updated');
    },
    onError: (error) => {
      logError(error, { action: 'plan.subscribe' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'plan.subscribe' }) || 'Failed to update plan');
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground mb-4">
              Choose the right plan for you
            </h1>
            <p className="text-muted-foreground">
              Unlock premium features and reach more tenants/owners faster.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans?.map((plan) => {
              const isCurrent = subscription?.plan_id === plan.id && subscription.status === 'active';
              const buttonLabel = plan.price_monthly === 0 ? 'Get Started' : isCurrent ? 'Current Plan' : 'Subscribe Now';
              const isDisabled = isCurrent || subscribeMutation.isPending;

              return (
                <div
                  key={plan.id}
                  className={`relative bg-card rounded-2xl border p-8 flex flex-col ${
                  plan.is_recommended ? 'border-primary shadow-lg ring-1 ring-primary' : 'border-border'
                }`}
              >
                {plan.is_recommended && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Recommended
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-bold text-foreground">₹{plan.price_monthly}</span>
                    {plan.price_monthly > 0 && <span className="ml-1 text-muted-foreground">/month</span>}
                  </div>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.description && (
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-sm text-foreground">{plan.description}</span>
                    </li>
                  )}
                  {plan.max_listings && (
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-sm text-foreground">
                        Up to {plan.max_listings} active listings
                      </span>
                    </li>
                  )}
                  {plan.highlight_listings && (
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-sm text-foreground">
                        Highlighted placement in search results
                      </span>
                    </li>
                  )}
                  {plan.priority_support && (
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-sm text-foreground">
                        Priority support from ZeroBroker team
                      </span>
                    </li>
                  )}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.is_recommended ? 'default' : 'outline'}
                  disabled={isDisabled}
                  onClick={() => {
                    if (!user) {
                      navigate('/login');
                      return;
                    }
                    subscribeMutation.mutate(plan);
                  }}
                >
                  {subscribeMutation.isPending && !isCurrent ? 'Updating...' : buttonLabel}
                </Button>
              </div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
