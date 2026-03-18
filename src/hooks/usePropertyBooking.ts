import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function usePropertyBooking(propertyId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['property-booking', propertyId, user?.profile?.id],
    queryFn: async () => {
      if (!user?.profile?.id || !propertyId) return null;

      const { data, error } = await supabase
        .from('visit_bookings')
        .select('*')
        .eq('property_id', propertyId)
        .eq('tenant_id', user.profile.id)
        .in('booking_status', ['pending', 'confirmed', 'completed'])
        .maybeSingle();

      if (error) {
        console.error('Error fetching booking status:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.profile?.id && !!propertyId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}
