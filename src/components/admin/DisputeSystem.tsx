import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  User,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function DisputeSystem() {
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [reply, setReply] = useState('');
  const queryClient = useQueryClient();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async () => {
      const res = await fetch('/api/admin/tickets');
      if (!res.ok) throw new Error('Failed to fetch tickets');
      return res.json();
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, status, message }: { id: string; status?: string; message?: string }) => {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, message }),
      });
      if (!res.ok) throw new Error('Failed to update ticket');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      toast.success('Ticket updated');
      setReply('');
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return <Badge className="bg-blue-500">Open</Badge>;
      case 'IN_PROGRESS': return <Badge className="bg-yellow-500">In Progress</Badge>;
      case 'RESOLVED': return <Badge className="bg-green-500">Resolved</Badge>;
      case 'CLOSED': return <Badge variant="secondary">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 font-bold';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Ticket List */}
      <div className="lg:col-span-1 space-y-4">
        <h2 className="text-xl font-semibold flex items-center">
          <MessageSquare className="w-5 h-5 mr-2" />
          Active Tickets
        </h2>
        <div className="border rounded-md divide-y max-h-[600px] overflow-y-auto bg-card">
          {isLoading ? (
            <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          ) : tickets?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No tickets found</div>
          ) : (
            tickets?.map((ticket: any) => (
              <div 
                key={ticket._id}
                className={`p-4 cursor-pointer hover:bg-accent transition-colors ${selectedTicket?._id === ticket._id ? 'bg-accent' : ''}`}
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] uppercase tracking-wider ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  {getStatusBadge(ticket.status)}
                </div>
                <h3 className="font-medium text-sm line-clamp-1">{ticket.subject}</h3>
                <div className="flex items-center mt-2 text-[10px] text-muted-foreground">
                  <User className="w-3 h-3 mr-1" />
                  {ticket.userId.slice(0, 8)}...
                  <Clock className="w-3 h-3 ml-3 mr-1" />
                  {format(new Date(ticket.updatedAt), 'MMM d')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ticket Detail & Chat */}
      <div className="lg:col-span-2 space-y-4">
        {selectedTicket ? (
          <div className="border rounded-md h-[600px] flex flex-col bg-card">
            <div className="p-4 border-b flex justify-between items-center bg-muted/30">
              <div>
                <h2 className="font-bold">{selectedTicket.subject}</h2>
                <p className="text-xs text-muted-foreground">Category: {selectedTicket.category}</p>
              </div>
              <div className="flex gap-2">
                {selectedTicket.status !== 'RESOLVED' && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-green-600"
                    onClick={() => updateTicketMutation.mutate({ id: selectedTicket._id, status: 'RESOLVED' })}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Resolve
                  </Button>
                )}
                {selectedTicket.status === 'OPEN' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => updateTicketMutation.mutate({ id: selectedTicket._id, status: 'IN_PROGRESS' })}
                  >
                    In Progress
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-muted p-3 rounded-lg text-sm mb-6">
                <p className="font-semibold mb-1">Original Issue:</p>
                {selectedTicket.description}
              </div>

              {selectedTicket.history?.map((msg: any, i: number) => (
                <div key={i} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.isAdmin ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}>
                    <p>{msg.message}</p>
                    <p className="text-[10px] mt-1 opacity-70">
                      {format(new Date(msg.timestamp), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t mt-auto">
              <div className="flex gap-2">
                <Textarea 
                  placeholder="Type your response..." 
                  className="min-h-[80px]"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <Button 
                  className="self-end" 
                  size="icon"
                  disabled={!reply.trim() || updateTicketMutation.isPending}
                  onClick={() => updateTicketMutation.mutate({ id: selectedTicket._id, message: reply })}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border rounded-md h-[600px] flex items-center justify-center text-muted-foreground bg-card animate-pulse">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Select a ticket to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
