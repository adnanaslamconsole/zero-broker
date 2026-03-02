import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { getUserFriendlyErrorMessage, logError } from '@/lib/errors';

export function useShortlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all shortlisted property IDs for the current user
  const { data: shortlistedIds = [] } = useQuery({
    queryKey: ['shortlisted-property-ids', user?.profile.id, user?.profile.isDemo],
    queryFn: async () => {
      if (!user) return [];
      
      // Handle demo users with localStorage
      if (user.profile.isDemo) {
        const demoShortlists = localStorage.getItem(`demo_shortlists_${user.profile.id}`);
        return demoShortlists ? JSON.parse(demoShortlists) : [];
      }

      const { data, error } = await supabase
        .from('shortlists')
        .select('property_id')
        .eq('user_id', user.profile.id);

      if (error) throw error;
      return data.map((item) => item.property_id);
    },
    enabled: !!user,
  });

  // Toggle shortlist status
  const toggleShortlistMutation = useMutation({
    mutationFn: async ({ propertyId, isShortlisted }: { propertyId: string; isShortlisted: boolean }) => {
      if (!user) {
        throw new Error('You must be logged in to shortlist properties');
      }

      // Handle demo users with localStorage
      if (user.profile.isDemo) {
        const storageKey = `demo_shortlists_${user.profile.id}`;
        const demoShortlists = localStorage.getItem(storageKey);
        let currentShortlists: string[] = demoShortlists ? JSON.parse(demoShortlists) : [];
        
        let action: 'added' | 'removed';
        if (isShortlisted) {
          currentShortlists = currentShortlists.filter(id => id !== propertyId);
          action = 'removed';
        } else {
          currentShortlists.push(propertyId);
          action = 'added';
        }
        
        localStorage.setItem(storageKey, JSON.stringify(currentShortlists));
        // Mock delay for demo feel
        await new Promise(resolve => setTimeout(resolve, 500));
        return { propertyId, action };
      }

      if (isShortlisted) {
        // Remove from shortlist
        const { error } = await supabase
          .from('shortlists')
          .delete()
          .eq('user_id', user.profile.id)
          .eq('property_id', propertyId);
        
        if (error) throw error;
        return { propertyId, action: 'removed' };
      } else {
        // Add to shortlist
        const { error } = await supabase
          .from('shortlists')
          .insert({
            user_id: user.profile.id,
            property_id: propertyId,
          });
        
        if (error) throw error;
        return { propertyId, action: 'added' };
      }
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['shortlisted-property-ids', user?.profile.id] });
      queryClient.invalidateQueries({ queryKey: ['shortlisted-properties', user?.profile.id] });
      
      toast.success(
        data.action === 'added' 
          ? 'Property added to shortlist' 
          : 'Property removed from shortlist'
      );
    },
    onError: (error: Error) => {
      logError(error, { action: 'shortlist.toggle' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'shortlist.toggle' }) || 'Failed to update shortlist');
    },
  });

  const isShortlisted = (propertyId: string) => shortlistedIds.includes(propertyId);

  return {
    shortlistedIds,
    isShortlisted,
    toggleShortlist: (propertyId: string) => {
      const currentlyShortlisted = isShortlisted(propertyId);
      toggleShortlistMutation.mutate({ propertyId, isShortlisted: currentlyShortlisted });
    },
    isLoading: toggleShortlistMutation.isPending,
  };
}
