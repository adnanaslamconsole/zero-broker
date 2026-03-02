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
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('properties')
        .update({ 
          verification_status: status,
          is_verified: status === 'approved' 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Listing status updated');
    },
    onError: (error: Error) => {
      logError(error, { action: 'admin.moderateListing' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'admin.moderateListing' }) || 'Failed to update listing');
    },
  });

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
                          onClick={() => verifyMutation.mutate({ id: property.id, status: 'approved' })}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => verifyMutation.mutate({ id: property.id, status: 'rejected' })}
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
