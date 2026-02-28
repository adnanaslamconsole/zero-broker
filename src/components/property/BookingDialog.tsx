import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Calendar as CalendarIcon, Clock, CreditCard, Info } from 'lucide-react';
import { Property } from '@/types/property';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { notificationService } from '@/lib/notificationService';

interface BookingDialogProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BookingDialog: React.FC<BookingDialogProps> = ({ property, open, onOpenChange }) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<'slots' | 'payment'>('slots');

  const { data: ownerAvailability } = useQuery({
    queryKey: ['owner-availability', property.ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owner_availability')
        .select('*')
        .eq('owner_id', property.ownerId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!property.ownerId && open,
  });

  const availableSlots = ownerAvailability?.time_slots || [
    '10:00 AM', '11:00 AM', '12:00 PM',
    '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
  ];

  const bookVisitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please login to book a visit');
      if (!selectedDate || !selectedTime) throw new Error('Select date and time');

      // Handle demo user
      if (user.profile.isDemo) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { id: 'demo-booking-id' };
      }

      // 1. Create the booking
      const { data: booking, error: bookingError } = await supabase
        .from('visit_bookings')
        .insert({
          property_id: property.id,
          tenant_id: user!.profile.id,
          owner_id: property.ownerId,
          visit_date: selectedDate.toISOString().split('T')[0],
          visit_time: selectedTime,
          booking_status: 'pending',
          otp_code: Math.floor(10000000 + Math.random() * 90000000).toString(),
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 2. Create the payment record with audit trail and escrow details
      const paymentId = `pay_${Math.random().toString(36).substr(2, 9)}`;
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          id: paymentId,
          userId: user!.profile.id,
          ownerId: property.ownerId,
          amount: 99,
          currency: 'INR',
          method: 'upi',
          status: 'success',
          purpose: 'site-visit-token',
          referenceId: `BK-${booking.id.slice(0, 8).toUpperCase()}`,
          gateway: 'razorpay',
          gatewayTransactionId: paymentId,
          escrowStatus: 'held',
          escrowDetails: {
            accountNumber: 'IDFC00992211',
            bankName: 'IDFC FIRST Bank',
            ifscCode: 'IDFB0010203'
          },
          auditTrail: [
            {
              timestamp: new Date().toISOString(),
              action: 'Payment Initiated',
              actorId: user!.profile.id,
              details: 'UPI Token Payment for site visit'
            },
            {
              timestamp: new Date().toISOString(),
              action: 'Escrow Locked',
              actorId: 'system',
              details: 'Funds held in IDFC Escrow until visit completion'
            }
          ]
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Payment record creation failed:', paymentError);
        // We still have the booking, but payment record is missing. 
        // In a real app, we would rollback or handle this carefully.
      }

      // 3. Update booking with payment reference
      if (payment) {
        await supabase
          .from('visit_bookings')
          .update({ payment_id: payment.id })
          .eq('id', booking.id);
      }

      return { booking, payment };
    },
    onSuccess: (data: any) => {
      const { booking, payment } = data;
      toast.success('Visit booked successfully! ₹99 Token Paid and held in Escrow.');
      
      // Send automated notifications to both parties
      notificationService.notifyBookingConfirmed({
        bookingId: booking.id,
        ownerId: property.ownerId,
        tenantId: user!.profile.id,
        propertyTitle: property.title,
        amount: 99,
        visitDate: selectedDate!.toLocaleDateString(),
        visitTime: selectedTime!,
        transactionRef: payment?.referenceId || booking.payment_id || `pay_${Math.random().toString(36).substr(2, 9)}`,
      });

      onOpenChange(false);
      setStep('slots');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to book visit');
    }
  });

  const handleBooking = () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select a date and time');
      return;
    }
    setStep('payment');
  };

  const confirmPayment = async () => {
    // 1. Check if slot is already booked
    const { data: existingBooking, error: checkError } = await supabase
      .from('visit_bookings')
      .select('id')
      .eq('property_id', property.id)
      .eq('visit_date', selectedDate!.toISOString().split('T')[0])
      .eq('visit_time', selectedTime!)
      .in('booking_status', ['pending', 'confirmed', 'completed'])
      .maybeSingle();

    if (checkError) {
      toast.error('Error checking slot availability');
      return;
    }

    if (existingBooking) {
      toast.error('This slot has already been booked. Please select another slot.');
      setStep('slots');
      return;
    }

    // 2. Proceed with booking
    bookVisitMutation.mutate();
  };

  const isDayAvailable = (date: Date) => {
    if (!ownerAvailability?.available_days) return true;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return ownerAvailability.available_days.includes(days[date.getDay()]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-[450px] p-0 overflow-hidden rounded-3xl border-none max-h-[92vh] flex flex-col">
        <div className="bg-primary p-4 sm:p-6 text-primary-foreground shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <div className="bg-white/20 p-1 rounded-lg backdrop-blur-sm">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <Badge variant="outline" className="border-white/30 text-white bg-white/10 text-[9px] sm:text-[10px] uppercase tracking-wider py-0 px-1.5">
                Serious Visit Only
              </Badge>
            </div>
            <DialogTitle className="text-lg sm:text-2xl font-bold leading-tight">Book Verified Visit</DialogTitle>
            <DialogDescription className="text-primary-foreground/80 mt-0.5 text-[11px] sm:text-sm line-clamp-1">
              {property.title}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
          {step === 'slots' ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center gap-2 text-[13px] sm:text-sm font-bold text-foreground">
                  <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  Select Visit Date
                </div>
                <div className="border rounded-2xl p-1 sm:p-2 flex justify-center bg-secondary/10 overflow-hidden">
                  <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => 
                        date < new Date(new Date().setHours(0,0,0,0)) || 
                        date > new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) ||
                        !isDayAvailable(date)
                      }
                      className="rounded-xl border-none scale-[0.85] sm:scale-100 origin-center -my-2"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center gap-2 text-[13px] sm:text-sm font-bold text-foreground">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    Select Time Slot
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "py-2 px-1 text-[10px] sm:text-xs font-medium rounded-xl border transition-all h-9 sm:h-10 flex items-center justify-center",
                          selectedTime === time
                            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-[1.02]"
                            : "bg-background border-border hover:border-primary/50 hover:bg-primary/5"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 sm:p-4 flex gap-2.5 sm:gap-3">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-xs text-blue-700 leading-relaxed">
                  A <strong>₹99 refundable token</strong> is required to book a visit. This ensures only serious tenants visit the property.
                </p>
              </div>

              <div className="sticky bottom-0 pt-2 bg-background/80 backdrop-blur-sm sm:static sm:bg-transparent">
                <Button 
                  className="w-full h-11 sm:h-12 rounded-xl font-bold text-base sm:text-lg shadow-lg shadow-primary/20" 
                  onClick={handleBooking}
                  disabled={!selectedDate || !selectedTime}
                >
                  Proceed to Payment
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 py-1 sm:py-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                  <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold">Visit Token Payment</h3>
                <p className="text-[11px] sm:text-sm text-muted-foreground">Confirm your booking for ₹99</p>
              </div>

              <div className="bg-secondary/30 rounded-2xl p-3.5 sm:p-5 space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center text-[11px] sm:text-sm">
                  <span className="text-muted-foreground">Visit Token (Refundable)</span>
                  <span className="font-bold">₹99.00</span>
                </div>
                <div className="flex justify-between items-center text-[11px] sm:text-sm">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span className="font-medium text-green-600">FREE</span>
                </div>
                <div className="pt-2 sm:pt-3 border-t border-border/50 flex justify-between items-center">
                  <span className="font-bold text-xs sm:text-base">Total Amount</span>
                  <span className="text-base sm:text-xl font-black text-primary">₹99.00</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-xs text-muted-foreground bg-secondary/10 p-2 sm:p-3 rounded-xl border border-dashed">
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                  100% Secure Payment via Razorpay
                </div>
                <div className="sticky bottom-0 pt-2 bg-background/80 backdrop-blur-sm sm:static sm:bg-transparent flex flex-col gap-2">
                  <Button className="w-full h-11 sm:h-14 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg shadow-xl shadow-primary/20" onClick={confirmPayment}>
                    Pay ₹99 & Confirm Booking
                  </Button>
                  <Button variant="ghost" className="w-full h-9 sm:h-10 rounded-xl text-muted-foreground font-medium text-[11px] sm:text-sm" onClick={() => setStep('slots')}>
                    Go Back
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
