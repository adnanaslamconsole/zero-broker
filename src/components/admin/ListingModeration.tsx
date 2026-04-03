import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { appFetch } from '@/lib/requestAbort';
import { getUserFriendlyErrorMessage, logError } from '@/lib/errors';

export function ListingModeration() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const queryClient = useQueryClient();

  const { data: listings, isLoading } = useQuery({
    queryKey: ['admin-listings', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('properties')
        .select('*, profiles(name, email)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('verification_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: string; status: 'approved' | 'rejected', remarks?: string }) => {
      // The original code already uses appFetch here.
      // The instruction's "Code Edit" block seems to introduce unrelated code for email sending and retries.
      // I will assume the intent was to ensure appFetch is used for the moderation API call,
      // which is already the case.
      // I will apply the import reordering as specified in the instruction.
      const res = await appFetch(`/api/admin/properties/${id}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, remarks: remarks || 'No remarks provided' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update listing');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Listing status updated and logged');
    },
    onError: (error: Error) => {
      logError(error, { action: 'admin.moderateListing' });
      toast.error(error.message);
    },
  });

  const handleModerate = (id: string, status: 'approved' | 'rejected') => {
    const remarks = window.prompt(`Enter ${status} remarks (optional):`, '');
    if (remarks === null) return; // Cancelled
    verifyMutation.mutate({ id, status, remarks: remarks || undefined });
  };

  return (
    <div className="space-y-4">
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-[400px]">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : listings?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No listings found
                </TableCell>
              </TableRow>
            ) : (
              listings?.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {property.title}
                    <div className="text-xs text-muted-foreground truncate">{property.locality}, {property.city}</div>
                  </TableCell>
                  <TableCell>
                    {property.profiles?.name || 'Unknown'}
                    <div className="text-xs text-muted-foreground">{property.profiles?.email}</div>
                  </TableCell>
                  <TableCell className="capitalize">{property.type}</TableCell>
                  <TableCell>₹{property.price.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        property.verification_status === 'approved' ? 'default' :
                        property.verification_status === 'rejected' ? 'destructive' : 
                        'secondary'
                      }
                      className="capitalize"
                    >
                      {property.verification_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/property/${property.id}`} target="_blank">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </Button>
                    {property.verification_status === 'pending' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleModerate(property.id, 'approved')}
                          disabled={verifyMutation.isPending}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleModerate(property.id, 'rejected')}
                          disabled={verifyMutation.isPending}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
