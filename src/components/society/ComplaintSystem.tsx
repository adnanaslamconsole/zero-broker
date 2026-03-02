import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, MessageSquareWarning } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getUserFriendlyErrorMessage, logError } from '@/lib/errors';

export function ComplaintSystem({ societyId, isAdmin }: { societyId: string, isAdmin: boolean }) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('maintenance');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: complaints, isLoading, refetch } = useQuery({
    queryKey: ['complaints', societyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('society_id', societyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from('complaints').insert({
        society_id: societyId,
        user_id: user.profile.id,
        title,
        description,
        category,
        status: 'open',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Complaint raised successfully');
      setIsDialogOpen(false);
      setTitle('');
      setDescription('');
      refetch();
    },
    onError: (error: Error) => {
      logError(error, { action: 'complaint.create' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'complaint.create' }) || 'Failed to raise complaint');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase
        .from('complaints')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status updated');
      refetch();
    },
    onError: (error: Error) => {
      logError(error, { action: 'complaint.updateStatus' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'complaint.updateStatus' }) || 'Failed to update status');
    },
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await createMutation.mutateAsync();
    setIsSubmitting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'resolved': return 'bg-green-100 text-green-800 hover:bg-green-100';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquareWarning className="w-5 h-5" />
          Complaints & Issues
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Raise Complaint</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Raise a New Complaint</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="parking">Parking</SelectItem>
                    <SelectItem value="amenities">Amenities</SelectItem>
                    <SelectItem value="noise">Noise/Disturbance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input 
                placeholder="Subject" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
              />
              <Textarea 
                placeholder="Describe the issue in detail..." 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                rows={4}
              />
              <Button onClick={handleSubmit} disabled={!title || !description || isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Complaint
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
        ) : complaints?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No complaints found. Everything seems good!
          </div>
        ) : (
          <div className="space-y-4">
            {complaints?.map((ticket) => (
              <div key={ticket.id} className="border rounded-lg p-4 bg-card/50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-base">{ticket.title}</h4>
                    <span className="text-xs text-muted-foreground capitalize">{ticket.category} • {new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                  <Badge variant="secondary" className={getStatusColor(ticket.status)}>
                    {ticket.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{ticket.description}</p>
                
                {isAdmin && ticket.status !== 'resolved' && (
                  <div className="flex justify-end gap-2 border-t pt-2 mt-2">
                    {ticket.status === 'open' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: ticket.id, status: 'in-progress' })}
                      >
                        Mark In Progress
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => updateStatusMutation.mutate({ id: ticket.id, status: 'resolved' })}
                    >
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
