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
import { Input } from '@/components/ui/input';
import { Search, Loader2, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { appFetch } from '@/lib/requestAbort';
import { getUserFriendlyErrorMessage, logError } from '@/lib/errors';

export function UserManagement() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const toggleBlockMutation = useMutation({
    mutationFn: async ({ id, isBlocked, reason }: { id: string; isBlocked: boolean; reason?: string }) => {
      const res = await appFetch(`/api/admin/users/${id}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isBlocked: !isBlocked, reason: reason || 'Administrative action' }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user status');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User status updated and action logged');
    },
    onError: (error: Error) => {
      logError(error, { action: 'admin.toggleBlockUser' });
      toast.error(error.message);
    },
  });

  const handleToggleBlock = (user: any) => {
    const action = user.is_blocked ? 'unblock' : 'block';
    const reason = window.prompt(`Reason for ${action}ing ${user.email}:`, '');
    if (reason === null) return; // Cancelled
    
    toggleBlockMutation.mutate({ 
      id: user.id, 
      isBlocked: user.is_blocked, 
      reason: reason || undefined 
    });
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Trust Score</TableHead>
              <TableHead>KYC Status</TableHead>
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
            ) : users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name || 'N/A'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getTrustScoreColor(user.trust_score || 0)}>
                      {user.trust_score || 100}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        user.kyc_status === 'verified' ? 'default' : 
                        user.kyc_status === 'pending' ? 'secondary' : 
                        'outline'
                      }
                      className={user.kyc_status === 'verified' ? 'bg-green-500 hover:bg-green-600' : ''}
                    >
                      {user.kyc_status || 'unverified'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.is_blocked ? (
                      <Badge variant="destructive">Blocked</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={user.is_blocked ? 'outline' : 'destructive'}
                      size="sm"
                      onClick={() => handleToggleBlock(user)}
                      disabled={toggleBlockMutation.isPending}
                    >
                      {user.is_blocked ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" /> Unblock
                        </>
                      ) : (
                        <>
                          <Ban className="w-4 h-4 mr-1" /> Block
                        </>
                      )}
                    </Button>
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
