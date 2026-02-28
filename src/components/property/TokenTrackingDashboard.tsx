import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  ShieldCheck, 
  History, 
  Wallet, 
  Building2, 
  CheckCircle2, 
  Clock,
  ArrowUpRight,
  Landmark,
  FileText
} from 'lucide-react';
import type { Payment, AuditLog } from '@/types/payments';
import { cn } from '@/lib/utils';

interface TokenTrackingDashboardProps {
  payments: Payment[];
  isLoading?: boolean;
}

export const TokenTrackingDashboard: React.FC<TokenTrackingDashboardProps> = ({ payments, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid gap-6 animate-pulse">
        <div className="h-40 bg-muted rounded-2xl" />
        <div className="h-64 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Token Amount Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-primary/20 rounded-xl">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-none">Active</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Token Held</p>
              <h3 className="text-2xl font-black text-foreground">₹{(payments.filter(p => p.escrowStatus === 'held').reduce((acc, p) => acc + p.amount, 0)).toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-500/20 rounded-xl">
                <ArrowUpRight className="w-5 h-5 text-green-600" />
              </div>
              <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-none">Settled</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Released to Owner</p>
              <h3 className="text-2xl font-black text-foreground">₹{(payments.filter(p => p.escrowStatus === 'released').reduce((acc, p) => acc + p.amount, 0)).toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              </div>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 border-none">Verified</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Platform Protection</p>
              <h3 className="text-2xl font-black text-foreground">100% Secure</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Fund Flow Visualization */}
      <Card className="rounded-3xl border border-border shadow-xl overflow-hidden">
        <CardHeader className="bg-secondary/20 border-b border-border/50">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Live Fund Flow Tracking
          </CardTitle>
          <CardDescription>Visualizing how token amounts move through the escrow system</CardDescription>
        </CardHeader>
        <CardContent className="pt-8 pb-10">
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-12 max-w-3xl mx-auto">
            {/* Step 1: Tenant */}
            <div className="flex flex-col items-center gap-3 z-10">
              <div className="w-16 h-16 bg-background border-2 border-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/10">
                <Wallet className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm">Tenant Paid</p>
                <p className="text-[10px] text-muted-foreground">UPI/Card/NetBanking</p>
              </div>
            </div>

            {/* Connector 1 */}
            <div className="hidden md:block absolute left-[15%] right-[55%] top-[30px] h-0.5 bg-gradient-to-r from-primary to-blue-500">
              <ArrowRight className="absolute -right-1 -top-1.5 w-4 h-4 text-blue-500" />
            </div>
            <div className="md:hidden w-0.5 h-12 bg-gradient-to-b from-primary to-blue-500"></div>

            {/* Step 2: Escrow */}
            <div className="flex flex-col items-center gap-3 z-10">
              <div className="w-20 h-20 bg-blue-600 rounded-2xl flex flex-col items-center justify-center shadow-xl shadow-blue-500/20 text-white">
                <Landmark className="w-8 h-8 mb-1" />
                <span className="text-[10px] font-black uppercase tracking-tighter">Escrow Account</span>
              </div>
              <div className="text-center">
                <p className="font-bold text-sm">Funds Protected</p>
                <p className="text-[10px] text-muted-foreground">IDFC FIRST Bank • AC: ****9012</p>
              </div>
            </div>

            {/* Connector 2 */}
            <div className="hidden md:block absolute left-[55%] right-[15%] top-[30px] h-0.5 bg-gradient-to-r from-blue-500 to-green-500">
              <ArrowRight className="absolute -right-1 -top-1.5 w-4 h-4 text-green-500" />
            </div>
            <div className="md:hidden w-0.5 h-12 bg-gradient-to-b from-blue-500 to-green-500"></div>

            {/* Step 3: Owner */}
            <div className="flex flex-col items-center gap-3 z-10">
              <div className="w-16 h-16 bg-background border-2 border-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/10">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-center">
                <p className="font-bold text-sm">Settled to Owner</p>
                <p className="text-[10px] text-muted-foreground">Post-Visit Confirmation</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Detailed Transactions & Audit Trail */}
      <Card className="rounded-3xl border border-border shadow-xl overflow-hidden">
        <CardHeader className="bg-secondary/20 border-b border-border/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Token Transaction Audit Trail
            </CardTitle>
            <CardDescription>Complete history of all site-visit token payments</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 rounded-lg">
            <FileText className="w-3.5 h-3.5" /> Export Report
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-secondary/10 border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground">Transaction Details</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground">Escrow Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground">Payment Gateway</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-muted-foreground">Last Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                      No token transactions found for this property.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-secondary/5 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                            Ref: {payment.referenceId || 'TXN-' + payment.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {new Date(payment.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="font-black text-base">₹{payment.amount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-5">
                        <Badge 
                          className={cn(
                            "rounded-lg border-none text-[10px] px-2.5 py-0.5 font-bold",
                            payment.escrowStatus === 'held' ? "bg-amber-100 text-amber-700" : 
                            payment.escrowStatus === 'released' ? "bg-green-100 text-green-700" :
                            "bg-red-100 text-red-700"
                          )}
                        >
                          {payment.escrowStatus === 'held' ? 'Held in Escrow' : 
                           payment.escrowStatus === 'released' ? 'Released' : 'Refunded'}
                        </Badge>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium uppercase">{payment.gateway || 'Razorpay'}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">ID: {payment.gatewayTransactionId || 'pay_Okw9...' }</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          <span className="text-[11px] font-medium">
                            {payment.auditTrail[payment.auditTrail.length - 1]?.action || 'Payment Verified'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
