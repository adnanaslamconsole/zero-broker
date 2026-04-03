import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, History, User, Home, ShieldCheck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export function ActivityLogs() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-logs', page, search],
    queryFn: async () => {
      // Use search as a general text search or adminId filter
      const res = await fetch(`/api/admin/logs?page=${page}&limit=20&adminId=${search}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
  });

  const getActionIcon = (action: string) => {
    if (action.includes('USER')) return <User className="w-4 h-4 mr-2 text-blue-500" />;
    if (action.includes('LISTING')) return <Home className="w-4 h-4 mr-2 text-green-500" />;
    if (action.includes('LOGIN')) return <ShieldCheck className="w-4 h-4 mr-2 text-purple-500" />;
    return <History className="w-4 h-4 mr-2 text-muted-foreground" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('BLOCK') || action.includes('REJECT') || action.includes('DELETE')) {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    if (action.includes('APPROVE') || action.includes('UNBLOCK')) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by Admin ID..."
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
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead className="text-right">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : data?.logs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No logs found
                </TableCell>
              </TableRow>
            ) : (
              data?.logs?.map((log: any) => (
                <TableRow key={log._id}>
                  <TableCell>
                    <div className="font-medium">{log.adminName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{log.adminId.slice(0, 8)}...</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`flex items-center w-fit px-2 py-0.5 ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                      {log.action.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-mono">{log.targetType}: {log.targetId?.slice(0, 8)}...</div>
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <div className="text-sm truncate" title={JSON.stringify(log.details)}>
                      {log.details?.reason || log.details?.remarks || log.details?.propertyTitle || log.details?.userEmail || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-[10px] bg-muted px-1 rounded">{log.ip}</code>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data?.totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <div className="text-sm font-medium">
            Page {page} of {data.totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
