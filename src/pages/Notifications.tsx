import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Bell, Check, Trash2, Info, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.profile?.id],
    queryFn: async () => {
      if (!user || user.profile.isDemo) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.profile.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        // If notifications table doesn't exist yet (404), return empty array gracefully
        if (error.code === 'PGRST116' || error.message?.includes('not found')) {
          return [];
        }
        throw error;
      }
      return data as Notification[];
    },
    enabled: !!user && !user.profile.isDemo,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.profile.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      toast.success('All notifications marked as read');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      toast.success('Notification removed');
    },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-primary" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Please login</h2>
            <p className="text-muted-foreground">You need to be logged in to view notifications.</p>
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
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold text-foreground">Notifications</h1>
              {notifications && notifications.filter(n => !n.is_read).length > 0 && (
                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
                  {notifications.filter(n => !n.is_read).length} new
                </span>
              )}
            </div>
            {notifications && notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending || !notifications.some(n => !n.is_read)}
              >
                Mark all as read
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : notifications?.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border border-border/50 border-dashed">
                <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">You have no notifications yet.</p>
              </div>
            ) : (
              notifications?.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "group relative bg-card rounded-xl border p-4 transition-all hover:shadow-md",
                    n.is_read ? "border-border opacity-75" : "border-primary/20 bg-primary/5"
                  )}
                >
                  <div className="flex gap-4">
                    <div className="mt-1 shrink-0">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm font-semibold", !n.is_read && "text-primary")}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  </div>
                  
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur-sm rounded-lg p-1">
                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => markAsReadMutation.mutate(n.id)}
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(n.id)}
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

