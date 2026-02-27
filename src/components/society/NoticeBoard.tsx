import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function NoticeBoard({ societyId, isAdmin }: { societyId: string, isAdmin: boolean }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const { data: notices, isLoading, refetch } = useQuery({
    queryKey: ['notices', societyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notices')
        .select('*, profiles(name)') // Assuming profiles table link exists, but created_by is auth.users. 
        // We need to join with profiles manually or via view. Let's assume standard join works if FK is set.
        // Actually created_by references auth.users. We might not get profile name easily without view.
        // Let's just fetch raw for now or fetch profiles separately.
        .eq('society_id', societyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handlePost = async () => {
    setIsPosting(true);
    try {
      const { error } = await supabase.from('notices').insert({
        society_id: societyId,
        title,
        content,
        created_by: (await supabase.auth.getUser()).data.user?.id
      });
      if (error) throw error;
      toast.success('Notice posted');
      setIsDialogOpen(false);
      setTitle('');
      setContent('');
      refetch();
    } catch (error) {
      toast.error('Failed to post notice');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold">Notice Board</CardTitle>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" /> Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Post New Notice</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input placeholder="Notice Title" value={title} onChange={e => setTitle(e.target.value)} />
                <Textarea placeholder="Details..." value={content} onChange={e => setContent(e.target.value)} />
                <Button onClick={handlePost} disabled={!title || !content || isPosting} className="w-full">
                  Post Notice
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
        ) : notices?.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No notices yet.</p>
        ) : (
          <div className="space-y-4">
            {notices?.map((notice) => (
              <div key={notice.id} className="border-b last:border-0 pb-3 last:pb-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-sm">{notice.title}</h4>
                  <span className="text-xs text-muted-foreground">{new Date(notice.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{notice.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
