import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2, Building2, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const societySchema = z.object({
  name: z.string().min(3, 'Society name is required'),
  city: z.string().min(2, 'City is required'),
  locality: z.string().min(2, 'Locality is required'),
  address: z.string().min(5, 'Address is required'),
  total_flats: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)),
});

export function EnrollSociety({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<z.infer<typeof societySchema>>({
    resolver: zodResolver(societySchema),
  });

  const onSubmit = async (data: z.infer<typeof societySchema>) => {
    if (!user) {
      toast.error('Please login to enroll a society');
      return;
    }
    setIsCreating(true);
    try {
      console.log('Creating society...', data);
      
      // 1. Create Society
      const { data: society, error: societyError } = await supabase
        .from('societies')
        .insert({
          name: data.name,
          city: data.city,
          locality: data.locality,
          address: data.address,
          total_flats: data.total_flats,
          admin_id: user.profile.id,
        })
        .select()
        .single();

      if (societyError) {
        console.error('Society creation error:', societyError);
        throw societyError;
      }
      
      console.log('Society created:', society);

      // 2. Add creator as Admin Member
      const { error: memberError } = await supabase
        .from('society_members')
        .insert({
          society_id: society.id,
          user_id: user.profile.id,
          flat_no: 'Admin',
          role: 'admin',
          status: 'approved',
        });

      if (memberError) {
        console.error('Member creation error:', memberError);
        throw memberError;
      }

      toast.success('Society enrolled successfully!');
      onSuccess();
    } catch (error) {
      console.error('Enrollment error:', error);
      const err = error as Error;
      toast.error(err.message || 'Failed to enroll society');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Enroll Your Society</CardTitle>
        <CardDescription>Register your society to enable ZeroBrokerHood features.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Society Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Green Valley Apartments" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Bangalore" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="locality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Locality</FormLabel>
                    <FormControl>
                      <Input placeholder="Indiranagar" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Street, Landmark..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="total_flats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Flats</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isCreating}>
              {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enroll Society
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function JoinSociety({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedSociety, setSelectedSociety] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [flatNo, setFlatNo] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const { data: societies, isLoading } = useQuery({
    queryKey: ['search-societies', search],
    queryFn: async () => {
      if (search.length < 3) return [];
      const { data } = await supabase
        .from('societies')
        .select('*')
        .ilike('name', `%${search}%`)
        .limit(5);
      return data || [];
    },
    enabled: search.length >= 3,
  });

  const handleJoin = async () => {
    if (!user) {
      toast.error('Please login to join a society');
      return;
    }
    if (!selectedSociety || !flatNo) return;
    setIsJoining(true);
    try {
      const { error } = await supabase.from('society_members').insert({
        society_id: selectedSociety.id,
        user_id: user.profile.id,
        flat_no: flatNo,
        role: 'resident',
        status: 'pending', // Requires admin approval
      });

      if (error) throw error;
      toast.success('Request sent! Waiting for admin approval.');
      onSuccess();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to join society');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Join Existing Society</CardTitle>
        <CardDescription>Search and join your society community.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedSociety ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search society by name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {isLoading && <div className="text-center text-sm text-muted-foreground">Searching...</div>}
            <div className="space-y-2">
              {societies?.map((society) => (
                <div
                  key={society.id}
                  className="p-3 border rounded-lg hover:bg-secondary cursor-pointer flex items-center gap-3"
                  onClick={() => setSelectedSociety(society)}
                >
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{society.name}</p>
                    <p className="text-xs text-muted-foreground">{society.locality}, {society.city}</p>
                  </div>
                </div>
              ))}
              {search.length >= 3 && societies?.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">No societies found.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-secondary/30 rounded-lg">
              <p className="font-semibold">{selectedSociety.name}</p>
              <p className="text-sm text-muted-foreground">{selectedSociety.address}</p>
              <Button 
                variant="link" 
                className="h-auto p-0 text-xs mt-2" 
                onClick={() => setSelectedSociety(null)}
              >
                Change Society
              </Button>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Flat Number</label>
              <Input 
                placeholder="e.g. A-101" 
                value={flatNo} 
                onChange={(e) => setFlatNo(e.target.value)}
              />
            </div>

            <Button onClick={handleJoin} className="w-full" disabled={!flatNo || isJoining}>
              {isJoining && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Join Request
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
