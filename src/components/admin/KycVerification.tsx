import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, XCircle, Eye, CheckCircle2, AlertCircle, FileText, User, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface KycRequest {
  id: string;
  name: string;
  email: string;
  pan: string;
  aadhaarLast4: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  rejectionReason?: string;
  documents?: {
    id: string;
    type: string;
    path: string;
  }[];
}

export const KycVerification: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<KycRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-kyc-requests'],
    queryFn: async () => {
      // 1. Fetch profiles with pending status
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('kyc_status', 'pending')
        .order('updated_at', { ascending: false });
      
      if (profileError) throw profileError;
      
      // 2. Fetch documents for these profiles
      const profileIds = profiles.map(p => p.id);
      const { data: documents, error: docError } = await supabase
        .from('kyc_documents')
        .select('*')
        .in('user_id', profileIds);
      
      if (docError) throw docError;

      return profiles.map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        pan: p.pan_number,
        aadhaarLast4: p.aadhaar_number_masked?.slice(-4) || 'N/A',
        status: p.kyc_status,
        submittedAt: p.updated_at,
        rejectionReason: p.kyc_rejection_reason,
        documents: documents
          ?.filter(d => d.user_id === p.id)
          .map(d => ({
            id: d.id,
            type: d.document_type,
            path: d.file_path
          }))
      }));
    }
  });

  const getDocUrl = (path: string) => {
    const { data } = supabase.storage.from('kyc-documents').getPublicUrl(path);
    return data.publicUrl;
  };

  const updateKycMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string, status: 'approved' | 'rejected', reason?: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: status === 'approved' ? 'verified' : 'rejected',
          kyc_rejection_reason: reason || null,
          trust_score: status === 'approved' ? 100 : 80 // Start verified owners at 100
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(`Owner ${variables.status === 'approved' ? 'verified' : 'rejected'} successfully!`);
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-requests'] });
      setIsDetailsOpen(false);
      setIsRejectOpen(false);
      setRejectionReason('');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update KYC status');
    }
  });

  const handleApprove = (id: string) => {
    updateKycMutation.mutate({ id, status: 'approved' });
  };

  const handleReject = () => {
    if (!rejectionReason) {
      toast.error('Please provide a rejection reason');
      return;
    }
    updateKycMutation.mutate({ 
      id: selectedRequest?.id || '', 
      status: 'rejected', 
      reason: rejectionReason 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Owner Verification Requests</CardTitle>
              <CardDescription>Review and manage KYC documents from property owners.</CardDescription>
            </div>
            <Badge variant="outline" className="bg-primary/5 text-primary">
              {requests?.length || 0} Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>PAN / Aadhaar</TableHead>
                <TableHead>Submitted On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests?.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold">{request.name}</span>
                      <span className="text-xs text-muted-foreground">{request.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span className="font-mono uppercase">{request.pan}</span>
                      <span className="text-muted-foreground">Aadhaar: **** **** {request.aadhaarLast4}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(request.submittedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        request.status === 'approved' ? 'default' : 
                        request.status === 'rejected' ? 'destructive' : 
                        'secondary'
                      }
                      className={request.status === 'approved' ? 'bg-green-500 hover:bg-green-600' : ''}
                    >
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setSelectedRequest(request);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {requests?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    No pending verification requests.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Review KYC: {selectedRequest?.name}</DialogTitle>
            <DialogDescription>Verify the uploaded documents against the provided details.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase">Full Name</Label>
                <p className="font-bold">{selectedRequest?.name}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase">PAN Number</Label>
                <p className="font-mono uppercase">{selectedRequest?.pan}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase">Aadhaar (Last 4)</Label>
                <p className="font-mono">{selectedRequest?.aadhaarLast4}</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase">Documents</Label>
              <div className="grid grid-cols-2 gap-2">
                {selectedRequest?.documents?.map((doc) => {
                  const Icon = doc.type === 'selfie' ? Camera : (doc.type === 'property_doc' ? ShieldCheck : FileText);
                  return (
                    <a 
                      key={doc.id} 
                      href={getDocUrl(doc.path)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-3 border rounded-xl bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-colors group"
                    >
                      <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary mb-1" />
                      <span className="text-[10px] font-medium capitalize">{doc.type.replace('_', ' ')}</span>
                    </a>
                  );
                })}
                {(!selectedRequest?.documents || selectedRequest.documents.length === 0) && (
                  <div className="col-span-2 py-4 text-center text-xs text-muted-foreground bg-secondary/10 rounded-xl border border-dashed">
                    No documents uploaded.
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" className="gap-2 text-destructive border-destructive/20 hover:bg-destructive/5" onClick={() => setIsRejectOpen(true)}>
              <XCircle className="w-4 h-4" /> Reject
            </Button>
            <Button className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(selectedRequest?.id || '')}>
              <CheckCircle2 className="w-4 h-4" /> Approve & Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rejection Reason</DialogTitle>
            <DialogDescription>Explain why the verification was rejected.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="e.g. Uploaded documents are blurred, Name mismatch..." 
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
