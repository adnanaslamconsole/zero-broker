import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle } from 'lucide-react';

export function MaintenanceList({ societyId, userId }: { societyId: string, userId: string }) {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['maintenance', societyId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('society_id', societyId)
        .eq('user_id', userId)
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance & Bills</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
        ) : invoices?.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No pending bills.</p>
        ) : (
          <div className="space-y-4">
            {invoices?.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${inv.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{inv.month}</p>
                    <p className="text-xs text-muted-foreground">Due: {new Date(inv.due_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">₹{inv.amount}</p>
                  {inv.status === 'pending' ? (
                    <Button size="sm" variant="outline" className="mt-1 h-7">Pay Now</Button>
                  ) : (
                    <Badge variant="secondary" className="mt-1 bg-green-100 text-green-800">Paid</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
