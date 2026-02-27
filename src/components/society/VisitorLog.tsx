import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function VisitorLog({ societyId, flatNo }: { societyId: string, flatNo: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: visitors, isLoading, refetch } = useQuery({
    queryKey: ['visitors', societyId, flatNo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .eq('society_id', societyId)
        .eq('flat_no', flatNo) // Residents only see their own flat visitors
        .order('entry_time', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handlePreApprove = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('visitors').insert({
        society_id: societyId,
        flat_no: flatNo,
        visitor_name: visitorName,
        phone,
        purpose,
        status: 'approved', // Pre-approved
      });
      if (error) throw error;
      toast.success('Visitor pre-approved');
      setIsDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error('Failed to pre-approve visitor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (id: string, status: 'approved' | 'denied') => {
    try {
      await supabase.from('visitors').update({ status }).eq('id', id);
      toast.success(`Visitor ${status}`);
      refetch();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Visitor Log</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><UserPlus className="w-4 h-4 mr-2" /> Pre-approve</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pre-approve Visitor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input placeholder="Visitor Name" value={visitorName} onChange={e => setVisitorName(e.target.value)} />
              <Input placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} />
              <Input placeholder="Purpose (e.g. Delivery, Guest)" value={purpose} onChange={e => setPurpose(e.target.value)} />
              <Button onClick={handlePreApprove} disabled={isSubmitting} className="w-full">
                Generate Pass
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Visitor</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
            ) : visitors?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No recent visitors</TableCell></TableRow>
            ) : (
              visitors?.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="font-medium">{v.visitor_name}</div>
                    <div className="text-xs text-muted-foreground">{v.phone}</div>
                  </TableCell>
                  <TableCell>{v.purpose}</TableCell>
                  <TableCell className="text-xs">{new Date(v.entry_time).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={v.status === 'approved' ? 'default' : v.status === 'denied' ? 'destructive' : 'secondary'}>
                      {v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {v.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleAction(v.id, 'approved')}>
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleAction(v.id, 'denied')}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
