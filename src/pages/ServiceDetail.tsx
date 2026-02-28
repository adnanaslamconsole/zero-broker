import { FormEvent, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Calendar, MapPin, Clock } from 'lucide-react';

export default function ServiceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
      const query = supabase.from('services').select('*');
      
      if (isUuid) {
        query.eq('id', id);
      } else {
        query.eq('slug', id);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(id),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Please login to book a service');
      
      const { error } = await supabase
        .from('service_bookings')
        .insert({
          service_id: id,
          user_id: user.profile.id,
          city,
          address,
          booking_date: date,
          booking_time: time,
          notes,
          status: 'pending',
          total_amount: service.base_price,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service booked successfully!');
      setTimeout(() => navigate('/services'), 2000);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to book service');
      if (error.message.includes('login')) {
        navigate('/login');
      }
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!service || !city || !address || !date || !time) return;
    mutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-20 text-center">
          <div className="container mx-auto px-4">Service not found.</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-10">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Service Details */}
            <div>
              <div className="aspect-video rounded-xl overflow-hidden mb-6">
                <img 
                  src={service.image_url} 
                  alt={service.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-4">{service.name}</h1>
              <p className="text-muted-foreground text-lg mb-6">{service.description}</p>
              
              <div className="bg-secondary/30 rounded-xl p-6 mb-6">
                <h3 className="font-semibold mb-3">Features</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {service.features?.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-sm text-muted-foreground">Starting from</span>
                <span className="text-3xl font-bold text-primary">₹{service.base_price}</span>
                <span className="text-sm text-muted-foreground">/{service.price_unit}</span>
              </div>
            </div>

            {/* Booking Form */}
            <div className="bg-card rounded-xl border border-border p-6 h-fit shadow-lg">
              <h2 className="text-xl font-bold mb-6">Book this Service</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">City</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)} 
                        className="pl-9"
                        placeholder="Enter city"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        className="pl-9"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Preferred Time</label>
                  <Select value={time} onValueChange={setTime}>
                    <SelectTrigger className="pl-9 relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</SelectItem>
                      <SelectItem value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</SelectItem>
                      <SelectItem value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Full Address</label>
                  <Textarea 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    placeholder="House No, Street, Landmark..."
                    className="resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Notes (Optional)</label>
                  <Textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Any specific instructions..."
                    className="resize-none"
                    rows={2}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={mutation.isPending || !city || !address || !date || !time}
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : mutation.isSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Booking Confirmed
                    </>
                  ) : (
                    'Confirm Booking'
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  No payment required now. Pay after service.
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

