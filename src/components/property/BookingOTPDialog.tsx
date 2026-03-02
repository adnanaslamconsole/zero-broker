import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ShieldCheck, Calendar, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useMutation } from '@tanstack/react-query';
import { getUserFriendlyErrorMessage, logError } from '@/lib/errors';

interface BookingOTPDialogProps {
  booking: {
    id: string;
    propertyTitle: string;
    date: string;
    time: string;
    address: string;
    tenant_id: string;
    owner_id: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export const BookingOTPDialog: React.FC<BookingOTPDialogProps> = ({ booking, open, onOpenChange, onComplete }) => {
  const [otp, setOtp] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const verifyOtpMutation = useMutation({
    mutationFn: async (otpCode: string) => {
      // In a real app, this would be a Supabase RPC or edge function 
      // to check the OTP and update the status atomically
      const { data, error } = await supabase
        .from('visit_bookings')
        .select('otp_code')
        .eq('id', booking.id)
        .single();

      if (error) throw error;
      if (data.otp_code !== otpCode) throw new Error('Invalid OTP code. Please try again.');

      const { error: updateError } = await supabase
        .from('visit_bookings')
        .update({ 
          booking_status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;
      
      // Update trust scores (Simplified V1 logic)
      // Both parties get +2 for successful visit
      await Promise.all([
        supabase.rpc('update_trust_score', { user_id: booking.tenant_id, points: 2 }),
        supabase.rpc('update_trust_score', { user_id: booking.owner_id, points: 2 })
      ]);
      
      return true;
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast.success('Visit Verified Successfully!');
      if (onComplete) onComplete();
    },
    onError: (error: Error) => {
      logError(error, { action: 'booking.verifyOtp' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'booking.verifyOtp' }) || 'Verification failed');
    }
  });

  const handleVerify = () => {
    if (otp.length !== 8) {
      toast.error('Please enter a valid 8-digit OTP');
      return;
    }
    verifyOtpMutation.mutate(otp);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-[400px] p-0 overflow-hidden rounded-3xl border-none max-h-[92vh] flex flex-col">
        <div className="bg-primary p-4 sm:p-6 text-primary-foreground shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <div className="bg-white/20 p-1 sm:p-1.5 rounded-lg backdrop-blur-sm">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <Badge variant="outline" className="border-white/30 text-white bg-white/10 text-[9px] sm:text-[10px] uppercase tracking-wider py-0 px-1.5">
                On-Site Verification
              </Badge>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold leading-tight">Verify Visit OTP</DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
          {!isSuccess ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-secondary/30 rounded-2xl p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                <h4 className="font-bold text-sm sm:text-base text-foreground line-clamp-1">{booking.propertyTitle}</h4>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-[11px] sm:text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                    {booking.date}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                    {booking.time}
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{booking.address}</span>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 flex flex-col items-center">
                <p className="text-xs sm:text-sm font-medium text-center text-muted-foreground">
                  Ask the owner for the 8-digit OTP to confirm your visit.
                </p>
                <InputOTP
                  maxLength={8}
                  value={otp}
                  onChange={setOtp}
                  className="gap-1.5"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-7 h-10 sm:w-9 sm:h-12 text-sm sm:text-base font-bold rounded-lg border-2 focus:border-primary" />
                    <InputOTPSlot index={1} className="w-7 h-10 sm:w-9 sm:h-12 text-sm sm:text-base font-bold rounded-lg border-2 focus:border-primary" />
                    <InputOTPSlot index={2} className="w-7 h-10 sm:w-9 sm:h-12 text-sm sm:text-base font-bold rounded-lg border-2 focus:border-primary" />
                    <InputOTPSlot index={3} className="w-7 h-10 sm:w-9 sm:h-12 text-sm sm:text-base font-bold rounded-lg border-2 focus:border-primary" />
                    <InputOTPSlot index={4} className="w-7 h-10 sm:w-9 sm:h-12 text-sm sm:text-base font-bold rounded-lg border-2 focus:border-primary" />
                    <InputOTPSlot index={5} className="w-7 h-10 sm:w-9 sm:h-12 text-sm sm:text-base font-bold rounded-lg border-2 focus:border-primary" />
                    <InputOTPSlot index={6} className="w-7 h-10 sm:w-9 sm:h-12 text-sm sm:text-base font-bold rounded-lg border-2 focus:border-primary" />
                    <InputOTPSlot index={7} className="w-7 h-10 sm:w-9 sm:h-12 text-sm sm:text-base font-bold rounded-lg border-2 focus:border-primary" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="space-y-3 pt-2">
                <Button 
                  className="w-full h-11 sm:h-12 rounded-xl font-bold shadow-lg shadow-primary/20 text-sm sm:text-base" 
                  onClick={handleVerify}
                  disabled={otp.length !== 8 || verifyOtpMutation.isPending}
                >
                  {verifyOtpMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      Verifying...
                    </span>
                  ) : 'Verify & Complete Visit'}
                </Button>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center">
                  Verifying OTP will trigger your ₹99 refund automatically.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-4 sm:py-8 text-center space-y-4 sm:space-y-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-foreground">Visit Completed!</h3>
              <div className="bg-green-50 border border-green-100 rounded-2xl p-3 sm:p-4">
                <p className="text-[11px] sm:text-sm text-green-700 font-medium leading-relaxed">
                  ₹99 refund has been initiated to your original payment method. It will reflect in 3-5 business days.
                </p>
              </div>
              <Button className="w-full h-11 sm:h-12 rounded-xl font-bold text-sm sm:text-base" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
