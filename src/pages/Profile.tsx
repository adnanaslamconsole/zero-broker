import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Calendar, MapPin, Clock, Edit2, Camera, LogOut, Shield, Phone, Mail, User, Upload, Trash2, CheckCircle2, Crown, Zap, Heart, Building2, TrendingUp, ShieldCheck, AlertCircle, Plus, Info } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BookingOTPDialog } from '@/components/property/BookingOTPDialog';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'activity';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [demoAvatarUrl, setDemoAvatarUrl] = useState<string | null>(null);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const [isEditing, setIsEditing] = useState(false);
  const [selectedBookingForOTP, setSelectedBookingForOTP] = useState<any>(null);
  const [isOTPOpen, setIsOTPOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');

  // Initialize edit state when user loads
  useEffect(() => {
    if (user) {
      setEditName(user.profile.name || '');
      setEditMobile(user.profile.mobile || '');
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      // Handle demo user
      if (user.profile.isDemo) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ name: editName, mobile: editMobile })
        .eq('id', user.profile.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      setIsEditing(false);
      
      // Update local demo name/mobile if it's a demo user
      if (user?.profile.isDemo) {
        // No reload for demo users
        return;
      }
      
      // For real users, we avoid full reload which can reset session state
      // window.location.reload(); 
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    }
  });

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate();
  };


  const { data: bookings, isLoading: bookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: async () => {
      if (!user) return [];
      
      // Handle demo user with mock bookings
      if (user.profile.isDemo) {
        return [
          {
            id: 'demo-1',
            property_id: 'prop-1',
            tenant_id: user.profile.id,
            owner_id: 'owner-1',
            visit_date: new Date().toISOString().split('T')[0],
            visit_time: '10:00 AM',
            booking_status: 'confirmed',
            properties: { title: 'Modern Apartment in Downtown', address: '123 Main St, City' }
          }
        ];
      }

      const { data, error } = await supabase
        .from('visit_bookings')
        .select('*, properties(title, address)')
        .or(`tenant_id.eq.${user.profile.id},owner_id.eq.${user.profile.id}`)
        .order('visit_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: subscriptionInfo, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription-limits', user?.profile.id, user?.profile.isPaid],
    queryFn: async () => {
      if (!user) return { plan: null, used: 0 };

      // Handle demo user stats
      if (user.profile.isDemo) {
        if (user.profile.isPaid) {
          const { count } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', user.profile.id);

          return {
            plan: {
              name: 'Plus',
              max_listings: 10,
              price_monthly: 999
            },
            used: count || 0
          };
        }
        return { plan: null, used: 0 };
      }
      
      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('*, pricing_plans(*)')
        .eq('user_id', user.profile.id)
        .eq('status', 'active')
        .maybeSingle();
      
      const { count } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.profile.id);

      return {
        plan: sub?.pricing_plans,
        used: count || 0
      };
    },
    enabled: !!user,
  });

  // Fetch real counts for stats grid
  const { data: extraStats } = useQuery({
    queryKey: ['profile-extra-stats', user?.profile.id, user?.profile.isDemo],
    queryFn: async () => {
      if (!user) return { reviews: 0, saved: 0 };

      // Handle demo users with localStorage
      if (user.profile.isDemo) {
        const demoShortlists = localStorage.getItem(`demo_shortlists_${user.profile.id}`);
        const savedCount = demoShortlists ? JSON.parse(demoShortlists).length : 0;
        
        return {
          reviews: 0, // Demo users don't have reviews yet
          saved: savedCount
        };
      }

      const [reviewsRes, savedRes] = await Promise.all([
        supabase.from('property_reviews').select('*', { count: 'exact', head: true }).eq('user_id', user.profile.id),
        supabase.from('shortlists').select('*', { count: 'exact', head: true }).eq('user_id', user.profile.id)
      ]);

      return {
        reviews: reviewsRes.count || 0,
        saved: savedRes.count || 0
      };
    },
    enabled: !!user,
  });

  const { data: savedProperties, isLoading: savedLoading } = useQuery({
    queryKey: ['shortlisted-properties', user?.profile.id, user?.profile.isDemo],
    queryFn: async () => {
      if (!user) return [];

      // Handle demo users with localStorage and sample data
      if (user.profile.isDemo) {
        const demoShortlists = localStorage.getItem(`demo_shortlists_${user.profile.id}`);
        const propertyIds = demoShortlists ? JSON.parse(demoShortlists) : [];
        if (propertyIds.length === 0) return [];
        
        // Fetch real property details from Supabase for these IDs
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .in('id', propertyIds);
        
        if (error) throw error;
        return data?.map(p => ({
          ...p,
          // Map DB columns to frontend Property type if needed
          listingType: p.type,
          propertyType: p.property_category,
          bhk: p.bedrooms,
          furnishing: p.furnishing_status,
          carpetArea: p.area,
        })) || [];
      }

      const { data, error } = await supabase
        .from('shortlists')
        .select(`
          property_id,
          properties (*)
        `)
        .eq('user_id', user.profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(item => item.properties);
    },
    enabled: !!user,
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated');
      
      // Handle demo user
      if (user.profile.isDemo) {
        // Mock upload delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Create a local object URL for the demo user to see their "uploaded" photo
        const localUrl = URL.createObjectURL(file);
        
        // We can't easily update the global user state from here without a complex flow,
        // so we'll just show a success message for the demo experience.
        return localUrl;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${user.profile.id}/${fileName}`;

      // Upload image
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.profile.id);

      if (updateError) throw updateError;
      
      // Update local state instead of reloading
      const updatedUser = {
        ...user,
        profile: {
          ...user.profile,
          avatarUrl: publicUrl
        }
      };
      // We can't directly call setUser as it's not exported, 
      // but we can at least avoid the reload and set our local demo state if needed.
      // For real users, the next profile fetch or page visit will show the change.
      
      return publicUrl;
    },
    onSuccess: (url) => {
      toast.success('Profile photo updated');
      
      // For demo users, we update the local demoAvatarUrl state
      if (user?.profile.isDemo) {
        setDemoAvatarUrl(url);
        toast.info('Demo Mode: Photo update is temporary');
        return;
      }
      
      // For real users, we avoid window.location.reload() which can cause logout if session is flaky
      // Instead, we'll just update the local UI or trust the next navigation
      // toast.info('Refresh to see changes across all pages');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload photo');
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      await uploadAvatarMutation.mutateAsync(file);
    } finally {
      setIsUploading(false);
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getTrustScoreLabel = (score: number) => {
    if (score >= 90) return 'Trusted';
    if (score >= 70) return 'Moderate';
    return 'Risky';
  };

  const [kycForm, setKycForm] = useState({
    fullName: '',
    panNumber: '',
    aadhaarNumber: '',
  });

  const [kycFiles, setKycFiles] = useState<{
    selfie: File | null;
    propertyDoc: File | null;
    electricityBill: File | null;
  }>({
    selfie: null,
    propertyDoc: null,
    electricityBill: null,
  });

  const selfieInputRef = useRef<HTMLInputElement>(null);
  const propertyDocInputRef = useRef<HTMLInputElement>(null);
  const electricityBillInputRef = useRef<HTMLInputElement>(null);

  const handleKycFileChange = (type: keyof typeof kycFiles, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKycFiles(prev => ({ ...prev, [type]: file }));
      toast.success(`${file.name} selected`);
    }
  };

  const [availableDays, setAvailableDays] = useState<string[]>(['Sat', 'Sun']);
  const [timeSlots, setTimeSlots] = useState([
    { id: '1', slot: '10:00 AM - 12:00 PM', active: true },
    { id: '2', slot: '02:00 PM - 04:00 PM', active: true },
    { id: '3', slot: '04:00 PM - 06:00 PM', active: false },
    { id: '4', slot: '06:00 PM - 08:00 PM', active: false },
  ]);

  const { data: ownerAvailabilityData } = useQuery({
    queryKey: ['owner-availability-settings', user?.profile.id],
    queryFn: async () => {
      if (!user || user.profile.isDemo) return null;
      const { data, error } = await supabase
        .from('owner_availability')
        .select('*')
        .eq('owner_id', user.profile.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (ownerAvailabilityData) {
      setAvailableDays(ownerAvailabilityData.available_days || []);
      if (ownerAvailabilityData.time_slots) {
        setTimeSlots(prev => prev.map(s => ({
          ...s,
          active: ownerAvailabilityData.time_slots.includes(s.slot)
        })));
      }
    }
  }, [ownerAvailabilityData]);

  const toggleDay = (day: string) => {
    setAvailableDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleSlot = (id: string) => {
    setTimeSlots(prev => prev.map(slot => 
      slot.id === id ? { ...slot, active: !slot.active } : slot
    ));
  };

  const submitKycMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      // Handle demo user
      if (user.profile.isDemo) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return;
      }

      // 1. Upload files to Supabase Storage
      const uploadPromises = Object.entries(kycFiles).map(async ([key, file]) => {
        if (!file) return null;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.profile.id}/${key}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        // Ensure bucket exists or handle error
        const { error: uploadError } = await supabase.storage
          .from('kyc-documents')
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type
          });

        if (uploadError) {
          console.error(`Upload error for ${key}:`, uploadError);
          throw new Error(`Failed to upload ${key}: ${uploadError.message}`);
        }
        
        return { key, filePath };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // 2. Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          kyc_status: 'pending',
          pan_number: kycForm.panNumber,
          aadhaar_number_masked: kycForm.aadhaarNumber.replace(/\d(?=\d{4})/g, '*')
        })
        .eq('id', user.profile.id);

      if (profileError) throw profileError;

      // 3. Create kyc_documents entries
      const kycDocs = uploadedFiles
        .filter(f => f !== null)
        .map(f => ({
          user_id: user.profile.id,
          document_type: f!.key === 'propertyDoc' ? 'property_doc' : (f!.key === 'electricityBill' ? 'electricity_bill' : f!.key),
          file_path: f!.filePath,
          status: 'pending'
        }));

      if (kycDocs.length > 0) {
        const { error: docsError } = await supabase
          .from('kyc_documents')
          .insert(kycDocs);
        
        if (docsError) throw docsError;
      }
    },
    onSuccess: () => {
      toast.success('KYC documents submitted for verification!');
      // Reset form and files
      setKycForm({ fullName: '', panNumber: '', aadhaarNumber: '' });
      setKycFiles({ selfie: null, propertyDoc: null, electricityBill: null });
      // Invalidate queries to update UI
      refetchBookings(); // Using this as a proxy to refresh profile data if needed, or ideally invalidate 'auth-user'
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit KYC');
    }
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      // Handle demo user
      if (user.profile.isDemo) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return;
      }

      const activeSlots = timeSlots.filter(s => s.active).map(s => s.slot);
      
      const { error } = await supabase
        .from('owner_availability')
        .upsert({ 
          owner_id: user.profile.id,
          available_days: availableDays,
          time_slots: activeSlots,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Availability settings saved!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save availability');
    }
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto space-y-4">
            <h2 className="text-3xl font-display font-bold">Access Denied</h2>
            <p className="text-muted-foreground">Please login to manage your profile and bookings.</p>
            <Button size="lg" onClick={() => navigate('/login')} className="w-full">Login / Register</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background">
      <Header />
      <main className="py-12 container mx-auto px-4 max-w-6xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground">My Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your profile, bookings, and preferences.</p>
          </div>
          <Button variant="destructive" onClick={handleLogout} className="gap-2 shadow-sm hover:shadow-md transition-all">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
        
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Sidebar - Profile Card */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-xl sticky top-24 overflow-hidden relative group">
              {/* Decorative Background */}
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent -z-10" />
              
              <div className="relative flex flex-col items-center text-center mb-6 mt-4">
                <div className="relative mb-4">
                  <div className="w-28 h-28 rounded-full border-4 border-background shadow-2xl overflow-hidden bg-secondary flex items-center justify-center relative group/avatar">
                    {demoAvatarUrl ? (
                      <img src={demoAvatarUrl} alt={user.profile.name} className="w-full h-full object-cover" />
                    ) : user.profile.avatarUrl ? (
                      <img src={user.profile.avatarUrl} alt={user.profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-muted-foreground">
                        {user.profile.name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  
                  {/* Edit Button Badge */}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform"
                    disabled={isUploading}
                  >
                    {isUploading ? <span className="w-4 h-4 block rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Edit2 className="w-4 h-4" />}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>

                <h2 className="text-2xl font-bold text-foreground">{user.profile.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">{user.profile.email}</p>
                
                <div className="flex flex-col gap-2 items-center">
                  <div className="flex gap-2 justify-center">
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase text-[10px] tracking-wider">
                      {user.profile.roles?.[0] || 'Member'}
                    </Badge>
                    <Badge variant={user.profile.kycStatus === 'verified' ? 'verified' : 'secondary'} className="gap-1">
                      {user.profile.kycStatus === 'verified' ? (
                        <>
                          <ShieldCheck className="w-3 h-3" /> Verified Owner
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3" /> Unverified
                        </>
                      )}
                    </Badge>
                  </div>
                  <Badge variant="outline" className={cn("gap-1 font-bold", getTrustScoreColor(user.profile.trustScore))}>
                    <TrendingUp className="w-3 h-3" />
                    {user.profile.trustScore} {getTrustScoreLabel(user.profile.trustScore)}
                  </Badge>
                  {user.profile.kycStatus !== 'verified' && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-primary font-bold text-xs" onClick={() => handleTabChange('verification')}>
                      Complete KYC to list properties →
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="space-y-4 pt-6 border-t border-border/50">
                <div className="flex items-center gap-3 text-sm p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Mobile Number</p>
                    <p className="font-medium">{user.profile.mobile || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Email Address</p>
                    <p className="font-medium truncate max-w-[200px]">{user.profile.email}</p>
                  </div>
                </div>
              </div>

              <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full mt-6 gap-2">
                    <Edit2 className="w-4 h-4" /> Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input 
                        id="name" 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)} 
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile Number</Label>
                      <Input 
                        id="mobile" 
                        value={editMobile} 
                        onChange={(e) => setEditMobile(e.target.value)} 
                        placeholder="+91 99999 99999"
                      />
                    </div>
                    <Button onClick={handleUpdateProfile} disabled={updateProfileMutation.isPending} className="w-full">
                      {updateProfileMutation.isPending ? 'Updating...' : 'Save Changes'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Right Content - Stats & Bookings */}
          <div className="lg:col-span-8 space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
              { label: 'Bookings', value: bookings?.length || 0, icon: Calendar },
              { label: 'Properties', value: subscriptionInfo?.used || 0, icon: MapPin },
              { label: 'Reviews', value: extraStats?.reviews || 0, icon: CheckCircle2 },
              { label: 'Saved', value: extraStats?.saved || 0, icon: Heart },
            ].map((stat, i) => (
                <div key={i} className="bg-card/50 border border-border/50 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-card/80 transition-colors cursor-pointer group">
                  <stat.icon className="w-6 h-6 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Subscription Card */}
            <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Crown className="w-24 h-24 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Crown className="w-5 h-5 text-primary" />
                      My Subscription
                    </h3>
                    <p className="text-muted-foreground text-sm">Manage your plan and billing.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/plans')}>
                    {subscriptionInfo?.plan ? 'Upgrade Plan' : 'View Plans'}
                  </Button>
                </div>

                {subscriptionInfo?.plan ? (
                  <div className="bg-secondary/30 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{subscriptionInfo.plan.name}</span>
                        {subscriptionInfo.plan.is_recommended && (
                          <Badge variant="secondary" className="text-xs">PRO</Badge>
                        )}
                      </div>
                      <span className="font-bold text-lg">₹{subscriptionInfo.plan.price_monthly}<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Active Listings</span>
                        <span className="font-medium">{subscriptionInfo.used} of {subscriptionInfo.plan.max_listings || '∞'} used</span>
                      </div>
                      <Progress 
                        value={subscriptionInfo.plan.max_listings ? (subscriptionInfo.used / subscriptionInfo.plan.max_listings) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-secondary/30 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Free Plan</p>
                      <p className="text-sm text-muted-foreground">Limited features active.</p>
                    </div>
                    <Button size="sm" onClick={() => navigate('/plans')}>Subscribe Now</Button>
                  </div>
                )}
              </div>
            </div>

          {/* Right Content - Activities & Tabs */}
          <div className="lg:col-span-8">
            <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8 bg-card/50 backdrop-blur-sm border border-border/50 p-1 h-14 rounded-xl">
                <TabsTrigger value="activity" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2 font-bold text-xs sm:text-sm">
                  <Clock className="w-4 h-4" /> Activity
                </TabsTrigger>
                <TabsTrigger value="saved" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2 font-bold text-xs sm:text-sm">
                  <Heart className="w-4 h-4" /> Saved
                </TabsTrigger>
                <TabsTrigger value="verification" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2 font-bold text-xs sm:text-sm">
                  <ShieldCheck className="w-4 h-4" /> Verification
                </TabsTrigger>
                <TabsTrigger value="availability" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center gap-2 font-bold text-xs sm:text-sm">
                  <Calendar className="w-4 h-4" /> Availability
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="space-y-6">
                {/* Recent Bookings */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Recent Bookings</h3>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/services')}>New Booking</Button>
                  </div>

                  {bookings && bookings.length > 0 ? (
                    <div className="space-y-4">
                      {bookings.map((booking) => (
                        <div 
                          key={booking.id} 
                          className="group bg-card hover:bg-card/80 border border-border/50 rounded-xl p-4 flex flex-col sm:flex-row gap-4 transition-all hover:shadow-lg hover:border-primary/20"
                        >
                          <div className="w-full sm:w-32 h-32 sm:h-auto rounded-lg overflow-hidden shrink-0 relative">
                            <img 
                              src={booking.services?.image_url} 
                              alt={booking.services?.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                              <span className="text-white text-xs font-medium">{booking.services?.name}</span>
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{booking.properties?.title || 'Property Visit'}</h4>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {booking.properties?.address || 'Location'}
                                  </p>
                                </div>
                                <Badge 
                                  variant={
                                    booking.booking_status === 'confirmed' ? 'default' :
                                    booking.booking_status === 'completed' ? 'secondary' :
                                    'outline'
                                  }
                                  className={
                                    booking.booking_status === 'confirmed' ? 'bg-green-500 hover:bg-green-600' :
                                    booking.booking_status === 'pending' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200' : ''
                                  }
                                >
                                  {booking.booking_status}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                                {booking.properties?.address}
                              </p>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground border-t border-border/50 pt-3 mt-auto">
                              <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded">
                                <Calendar className="w-3 h-3" />
                                {new Date(booking.visit_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded">
                                <Clock className="w-3 h-3" />
                                {booking.visit_time}
                              </span>
                              {booking.booking_status === 'confirmed' && booking.tenant_id === user.profile.id && (
                                <Button 
                                  size="sm" 
                                  variant="default" 
                                  className="ml-auto h-7 px-3 text-[10px] font-bold rounded-lg gap-1 shadow-md shadow-primary/20"
                                  onClick={() => {
                                    setSelectedBookingForOTP({
                                      id: booking.id,
                                      propertyTitle: booking.properties?.title || 'Property Visit',
                                      date: new Date(booking.visit_date).toLocaleDateString(),
                                      time: booking.visit_time,
                                      address: booking.properties?.address || '',
                                      tenant_id: booking.tenant_id,
                                      owner_id: booking.owner_id
                                    });
                                    setIsOTPOpen(true);
                                  }}
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  Verify Visit
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-card/30 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                        <Calendar className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                      <p className="text-muted-foreground max-w-xs mx-auto mb-6">
                        Book your first home service today and track it here.
                      </p>
                      <Button onClick={() => navigate('/services')}>
                        Explore Services
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="saved" className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Saved Properties</h3>
                    <p className="text-sm text-muted-foreground">{savedProperties?.length || 0} properties</p>
                  </div>

                  {savedLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : savedProperties && savedProperties.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {savedProperties.map((property: any) => (
                        <PropertyCard key={property.id} property={property} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-card/30 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                        <Building2 className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No saved properties</h3>
                      <p className="text-muted-foreground max-w-xs mx-auto mb-6">
                        Save properties you like to view them later.
                      </p>
                      <Button onClick={() => navigate('/properties')}>
                        Browse Properties
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="availability" className="space-y-6">
                 <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                   <div className="flex items-center justify-between mb-6">
                     <div className="flex items-center gap-3">
                       <div className="p-3 bg-primary/10 rounded-xl text-primary">
                         <Calendar className="w-6 h-6" />
                       </div>
                       <div>
                         <h3 className="text-xl font-bold">Manage Visit Availability</h3>
                         <p className="text-sm text-muted-foreground">Set your available days and time slots for property visits.</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2" 
                  onClick={() => saveAvailabilityMutation.mutate()}
                  disabled={saveAvailabilityMutation.isPending}
                >
                  {saveAvailabilityMutation.isPending ? (
                    <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {saveAvailabilityMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                    Select Available Days
                  </h4>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={cn(
                          "py-3 rounded-xl border text-xs font-bold transition-all",
                          availableDays.includes(day)
                            ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                            : "bg-background border-border hover:border-primary/50"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    * Weekends are highly recommended for higher visit rates.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                    Set Time Slots
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {timeSlots.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleSlot(item.id)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                          item.active ? "bg-primary/5 border-primary/30" : "bg-background border-border"
                        )}
                      >
                        <span className={cn("text-xs font-medium", item.active ? "text-primary" : "text-muted-foreground")}>
                          {item.slot}
                        </span>
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                          item.active ? "border-primary bg-primary" : "border-muted-foreground/30"
                        )}>
                          {item.active && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full border border-dashed border-border rounded-xl h-10 text-muted-foreground hover:text-primary">
                    <Plus className="w-4 h-4 mr-2" /> Add custom slot
                  </Button>
                </div>
              </div>

                   <div className="mt-8 pt-6 border-t border-border/50 bg-secondary/10 -mx-6 -mb-6 px-6 pb-6 rounded-b-2xl">
                     <div className="flex items-start gap-3">
                       <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                       <div className="space-y-1">
                         <p className="text-xs font-bold text-foreground uppercase tracking-wider">How it works</p>
                         <p className="text-xs text-muted-foreground leading-relaxed">
                           Once you set your availability, tenants can only book visits during these times. 
                           Each booking requires a ₹99 refundable token. You will receive ₹49 if a tenant doesn't show up.
                         </p>
                       </div>
                     </div>
                   </div>
                 </div>
               </TabsContent>
               <TabsContent value="verification" className="space-y-6">
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Owner Verification (KYC)</h3>
                      <p className="text-sm text-muted-foreground">Get verified to list properties and build trust with tenants.</p>
                    </div>
                  </div>

                  {user.profile.kycStatus === 'verified' ? (
                    <div className="bg-green-500/10 border border-green-200 rounded-xl p-6 text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 text-white">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <h4 className="text-lg font-bold text-green-700 mb-2">You are a Verified Owner!</h4>
                      <p className="text-green-600/80 max-w-md mx-auto mb-6">
                        Your account has been successfully verified. You now have access to premium listing features and a verified badge.
                      </p>
                      <Button onClick={() => navigate('/post-property')} variant="default" className="bg-green-600 hover:bg-green-700">
                        Post a Property
                      </Button>
                    </div>
                  ) : user.profile.kycStatus === 'pending' ? (
                    <div className="bg-yellow-500/10 border border-yellow-200 rounded-xl p-6 text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mb-4 text-white">
                        <Clock className="w-10 h-10" />
                      </div>
                      <h4 className="text-lg font-bold text-yellow-700 mb-2">Verification in Progress</h4>
                      <p className="text-yellow-600/80 max-w-md mx-auto">
                        Our team is currently reviewing your documents. This usually takes 24-48 hours. We'll notify you once the process is complete.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {user.profile.kycStatus === 'rejected' && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-destructive">Verification Rejected</p>
                            <p className="text-sm text-destructive/80">{user.profile.kyc_rejection_reason || 'Please re-upload clear documents.'}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name (as per PAN)</Label>
                            <Input 
                              id="fullName" 
                              value={kycForm.fullName} 
                              onChange={(e) => setKycForm(prev => ({ ...prev, fullName: e.target.value }))}
                              placeholder="JOHN DOE" 
                              className="uppercase" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="pan">PAN Number</Label>
                            <Input 
                              id="pan" 
                              value={kycForm.panNumber} 
                              onChange={(e) => setKycForm(prev => ({ ...prev, panNumber: e.target.value }))}
                              placeholder="ABCDE1234F" 
                              className="uppercase" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="aadhaar">Aadhaar Number (Last 4 digits)</Label>
                            <Input 
                              id="aadhaar" 
                              value={kycForm.aadhaarNumber} 
                              onChange={(e) => setKycForm(prev => ({ ...prev, aadhaarNumber: e.target.value }))}
                              placeholder="1234" 
                              maxLength={4} 
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <p className="text-sm font-medium mb-2">Required Documents</p>
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="file"
                              ref={selfieInputRef}
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => handleKycFileChange('selfie', e)}
                            />
                            <input
                              type="file"
                              ref={propertyDocInputRef}
                              className="hidden"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleKycFileChange('propertyDoc', e)}
                            />
                            <input
                              type="file"
                              ref={electricityBillInputRef}
                              className="hidden"
                              accept="image/*,application/pdf"
                              onChange={(e) => handleKycFileChange('electricityBill', e)}
                            />
                            {[
                              { label: 'Selfie', icon: Camera, type: 'selfie', key: 'selfie', ref: selfieInputRef },
                              { label: 'Property Doc', icon: Building2, type: 'property_doc', key: 'propertyDoc', ref: propertyDocInputRef },
                              { label: 'Elec. Bill', icon: Zap, type: 'electricity_bill', key: 'electricityBill', ref: electricityBillInputRef },
                            ].map((doc) => (
                              <button
                                key={doc.type}
                                onClick={() => doc.ref.current?.click()}
                                className={cn(
                                  "flex flex-col items-center justify-center p-4 border border-dashed rounded-xl transition-colors group relative",
                                  kycFiles[doc.key as keyof typeof kycFiles] ? "bg-primary/5 border-primary" : "border-border hover:bg-secondary/50"
                                )}
                              >
                                {kycFiles[doc.key as keyof typeof kycFiles] ? (
                                  <CheckCircle2 className="w-6 h-6 text-primary mb-2" />
                                ) : (
                                  <doc.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary mb-2" />
                                )}
                                <span className="text-xs font-medium">{doc.label}</span>
                                {kycFiles[doc.key as keyof typeof kycFiles] && (
                                  <Badge className="absolute -top-2 -right-2 px-1 h-5 min-w-5">1</Badge>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <Button 
                          className="w-full h-12 rounded-xl font-bold gap-2" 
                          onClick={() => submitKycMutation.mutate()}
                          disabled={submitKycMutation.isPending || !kycForm.panNumber || !kycForm.aadhaarNumber}
                        >
                          {submitKycMutation.isPending ? (
                            <span className="w-5 h-5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                          ) : (
                            <ShieldCheck className="w-5 h-5" />
                          )}
                          {submitKycMutation.isPending ? 'Submitting...' : 'Submit for Verification'}
                        </Button>
                        <p className="text-[11px] text-muted-foreground text-center mt-3">
                          By submitting, you agree to our terms for owner verification and data privacy.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          </div>
        </div>
      </main>
      <Footer />
      {selectedBookingForOTP && (
        <BookingOTPDialog
          booking={selectedBookingForOTP}
          open={isOTPOpen}
          onOpenChange={setIsOTPOpen}
          onComplete={() => {
            // In real app, refresh bookings
            toast.success('Visit status updated');
          }}
        />
      )}
    </div>
  );
}

