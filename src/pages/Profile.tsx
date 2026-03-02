import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Calendar, MapPin, Clock, Edit2, Camera, LogOut, Phone, Mail, Trash2, CheckCircle2, Crown, Zap, Heart, Building2, TrendingUp, ShieldCheck, AlertCircle, Plus, Info, Eye, Users as UsersIcon, CreditCard, Receipt, FileText, MessageSquare } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getUserFriendlyErrorMessage, logError } from '@/lib/errors';
import { BookingOTPDialog } from '@/components/property/BookingOTPDialog';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type BookingForOTP = {
  id: string;
  propertyTitle: string;
  date: string;
  time: string;
  address: string;
  tenant_id: string;
  owner_id: string;
};

export default function Profile() {
  const { user, logout, updateProfile, uploadAvatar } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'activity';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const avatarPreviewUrlRef = useRef<string | null>(null);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const [isEditing, setIsEditing] = useState(false);
  const [selectedBookingForOTP, setSelectedBookingForOTP] = useState<BookingForOTP | null>(null);
  const [isOTPOpen, setIsOTPOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAttempted, setEditAttempted] = useState(false);

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
      await updateProfile({ name: editName, mobile: editMobile });
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      setIsEditing(false);
      setEditAttempted(false);
    },
    onError: (error: Error) => {
      logError(error, { action: 'profile.update' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'profile.update' }) || 'Failed to update profile');
    }
  });

  const handleUpdateProfile = () => {
    setEditAttempted(true);
    const name = editName.trim();
    const mobile = editMobile.trim();
    if (name.length < 2) {
      toast.error('Name must be at least 2 characters long');
      return;
    }
    if (mobile.length > 0 && !/^\+?\d{10,15}$/.test(mobile)) {
      toast.error('Please enter a valid mobile number');
      return;
    }
    updateProfileMutation.mutate();
  };


  const { data: bookings, refetch: refetchBookings } = useQuery({
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

  const { data: subscriptionInfo } = useQuery({
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
      return uploadAvatar(file);
    },
    onSuccess: () => {
      toast.success('Profile photo updated');
      if (avatarPreviewUrlRef.current) {
        URL.revokeObjectURL(avatarPreviewUrlRef.current);
        avatarPreviewUrlRef.current = null;
      }
      setAvatarPreviewUrl(null);
    },
    onError: (error: Error) => {
      logError(error, { action: 'profile.uploadAvatar' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'profile.uploadAvatar' }) || 'Failed to upload photo');
      if (avatarPreviewUrlRef.current) {
        URL.revokeObjectURL(avatarPreviewUrlRef.current);
        avatarPreviewUrlRef.current = null;
      }
      setAvatarPreviewUrl(null);
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const maxBytes = 5 * 1024 * 1024;
    if (!allowedTypes.has(file.type)) {
      toast.error('Please upload a JPG, PNG, or WEBP image');
      return;
    }
    if (file.size > maxBytes) {
      toast.error('Image size must be 5MB or less');
      return;
    }

    if (avatarPreviewUrlRef.current) {
      URL.revokeObjectURL(avatarPreviewUrlRef.current);
      avatarPreviewUrlRef.current = null;
    }

    const nextPreview = URL.createObjectURL(file);
    avatarPreviewUrlRef.current = nextPreview;
    setAvatarPreviewUrl(nextPreview);

    setIsUploading(true);
    try {
      await uploadAvatarMutation.mutateAsync(file);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (avatarPreviewUrlRef.current) {
        URL.revokeObjectURL(avatarPreviewUrlRef.current);
        avatarPreviewUrlRef.current = null;
      }
    };
  }, []);

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

  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [newSlotStart, setNewSlotStart] = useState('10:00');
  const [newSlotEnd, setNewSlotEnd] = useState('12:00');

  const handleAddCustomSlot = () => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hh = h % 12 || 12;
      return `${hh}:${minutes} ${ampm}`;
    };

    const newSlotStr = `${formatTime(newSlotStart)} - ${formatTime(newSlotEnd)}`;
    
    // Check if slot already exists
    if (timeSlots.some(s => s.slot === newSlotStr)) {
      toast.error('This time slot already exists');
      return;
    }

    const newId = (timeSlots.length + 1).toString();
    setTimeSlots(prev => [...prev, { id: newId, slot: newSlotStr, active: true }]);
    setIsAddSlotOpen(false);
    toast.success('Custom slot added');
  };

  const removeSlot = (id: string) => {
    setTimeSlots(prev => prev.filter(s => s.id !== id));
  };

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

  // Fetch Owner's Properties for Dashboard
  const { data: ownerProperties, isLoading: ownerPropertiesLoading } = useQuery({
    queryKey: ['owner-properties', user?.profile?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.profile.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const togglePropertyStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('properties')
        .update({ is_available: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Property status updated');
    }
  });

  const { data: rentSchedule } = useQuery({
    queryKey: ['rent-schedule', user?.profile?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from('rent_schedules')
          .select('*, properties(title, address)')
          .eq('tenant_id', user.profile.id);
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching rent schedule:', error);
        // Handle specific PostgREST errors (like missing table 404/PGRST205)
        if (error.code === 'PGRST205' || error.message?.includes('not found')) {
          console.warn('rent_schedules table not found in schema cache. Returning mock data.');
        }
        return [
          { id: '1', due_date: '2024-04-05', amount: 25000, status: 'upcoming', properties: { title: 'Modern Apartment', address: '123 Main St' } },
          { id: '2', due_date: '2024-03-05', amount: 25000, status: 'paid', properties: { title: 'Modern Apartment', address: '123 Main St' } }
        ];
      }
    },
    enabled: !!user,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });

  const { data: invoices } = useQuery({
    queryKey: ['invoices', user?.profile?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('user_id', user.profile.id);
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching invoices:', error);
        if (error.code === 'PGRST205' || error.message?.includes('not found')) {
          console.warn('invoices table not found in schema cache. Returning mock data.');
        }
        return [
          { id: 'inv-1', description: 'Platform Service Fee', amount: 999, created_at: '2024-03-01', status: 'paid' },
          { id: 'inv-2', description: 'Rent Payment - March', amount: 25000, created_at: '2024-03-05', status: 'paid' }
        ];
      }
    },
    enabled: !!user,
    retry: 2,
  });

  const { data: userLeases } = useQuery({
    queryKey: ['user-leases', user?.profile?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from('leases')
          .select('*, properties(title, address)')
          .eq('tenant_id', user.profile.id);
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching user leases:', error);
        if (error.code === 'PGRST205' || error.message?.includes('not found')) {
          console.warn('leases table not found in schema cache. Returning mock data.');
        }
        return [
          { 
            id: 'lease-1', 
            status: 'active', 
            start_date: '2024-01-01', 
            end_date: '2024-12-31', 
            monthly_rent: 25000,
            properties: { title: 'Modern Apartment', address: '123 Main St, City' } 
          }
        ];
      }
    },
    enabled: !!user,
    retry: 2,
  });

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
          // Special handling for missing bucket
          if (uploadError.message?.includes('Bucket not found')) {
            throw new Error(`Storage bucket 'kyc-documents' not found. Please create it in your Supabase dashboard or apply the necessary migrations.`);
          }
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
      logError(error, { action: 'profile.submitKyc' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'profile.submitKyc' }) || 'Failed to submit KYC');
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
      logError(error, { action: 'profile.saveAvailability' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'profile.saveAvailability' }) || 'Failed to save availability');
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
      <main className="py-4 pb-28 sm:py-12 container mx-auto px-4 max-w-6xl overflow-x-hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-10">
          <div className="w-full">
            <h1 className="text-xl xs:text-2xl sm:text-4xl font-display font-bold text-foreground">My Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-base">Manage your profile, bookings, and preferences.</p>
          </div>
          <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto gap-2 shadow-sm hover:shadow-md transition-all min-h-[44px] text-xs sm:text-sm">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
        
        <div className="grid gap-8 md:grid-cols-12">
          {/* Left Sidebar - Profile Card */}
          <div className="md:col-span-4 space-y-6">
            <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-3 sm:p-6 shadow-xl lg:sticky lg:top-24 overflow-hidden relative group">
              {/* Decorative Background */}
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent -z-10" />
              
              <div className="relative flex flex-col items-center text-center mb-6 mt-4">
                <div className="relative mb-4">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-background shadow-2xl overflow-hidden bg-secondary flex items-center justify-center relative group/avatar">
                    {avatarPreviewUrl ? (
                      <img src={avatarPreviewUrl} alt={user.profile.name} className="w-full h-full object-cover" />
                    ) : user.profile.avatarUrl ? (
                      <img src={user.profile.avatarUrl} alt={user.profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl sm:text-4xl font-bold text-muted-foreground">
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
                    className="absolute bottom-0 right-0 min-h-[44px] min-w-[44px] flex items-center justify-center group"
                    disabled={isUploading}
                    aria-label="Edit avatar"
                  >
                    <span className="p-2 bg-primary text-primary-foreground rounded-full shadow-lg group-hover:scale-110 transition-transform flex items-center justify-center">
                      {isUploading ? <span className="w-4 h-4 block rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Edit2 className="w-4 h-4" />}
                    </span>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                  />
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-foreground break-words max-w-full px-2">{user.profile.name}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 break-all max-w-full px-2">{user.profile.email}</p>
                
                <div className="flex flex-col gap-2 items-center w-full">
                  <div className="flex flex-wrap gap-2 justify-center px-2">
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase text-[9px] sm:text-[10px] tracking-wider py-1 px-2 min-h-[24px]">
                      {user.profile.roles?.[0] || 'Member'}
                    </Badge>
                    <Badge variant={user.profile.kycStatus === 'verified' ? 'verified' : 'secondary'} className="gap-1 py-1 px-2 text-[9px] sm:text-[10px] min-h-[24px]">
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
                  <Badge variant="outline" className={cn("gap-1 font-bold py-1 px-2 text-[9px] sm:text-[10px] min-h-[24px]", getTrustScoreColor(user.profile.trustScore))}>
                    <TrendingUp className="w-3 h-3" />
                    {user.profile.trustScore} {getTrustScoreLabel(user.profile.trustScore)}
                  </Badge>
                  {user.profile.kycStatus !== 'verified' && (
                    <Button variant="link" size="sm" className="h-auto min-h-[44px] p-2 text-primary font-bold text-[11px] sm:text-xs text-center px-4" onClick={() => handleTabChange('verification')}>
                      Complete KYC to list properties →
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="space-y-3 pt-6 border-t border-border/50">
                <div className="flex items-center gap-3 text-sm p-2 sm:p-3 rounded-lg hover:bg-secondary/50 transition-colors min-h-[44px]">
                  <div className="p-2 bg-primary/10 rounded-full text-primary shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Mobile Number</p>
                    <p className="font-medium text-xs sm:text-sm truncate min-h-[20px]">{user.profile.mobile || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm p-2 sm:p-3 rounded-lg hover:bg-secondary/50 transition-colors min-h-[44px]">
                  <div className="p-2 bg-primary/10 rounded-full text-primary shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Email Address</p>
                    <p className="font-medium text-xs sm:text-sm truncate min-h-[20px]">{user.profile.email}</p>
                  </div>
                </div>
              </div>

              <Dialog
                open={isEditing}
                onOpenChange={(open) => {
                  setIsEditing(open);
                  if (!open) setEditAttempted(false);
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full mt-6 gap-2 min-h-[44px] text-xs sm:text-sm">
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
                        aria-invalid={editAttempted && editName.trim().length < 2}
                        className={cn(editAttempted && editName.trim().length < 2 && "border-destructive focus-visible:ring-destructive")}
                      />
                      {editAttempted && editName.trim().length < 2 && (
                        <p className="text-xs text-destructive">Name must be at least 2 characters long.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile Number</Label>
                      <Input 
                        id="mobile" 
                        value={editMobile} 
                        onChange={(e) => setEditMobile(e.target.value)} 
                        placeholder="+91 99999 99999"
                        aria-invalid={editAttempted && editMobile.trim().length > 0 && !/^\+?\d{10,15}$/.test(editMobile.trim())}
                        className={cn(
                          editAttempted &&
                            editMobile.trim().length > 0 &&
                            !/^\+?\d{10,15}$/.test(editMobile.trim()) &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      {editAttempted && editMobile.trim().length > 0 && !/^\+?\d{10,15}$/.test(editMobile.trim()) && (
                        <p className="text-xs text-destructive">Enter a valid mobile number (10–15 digits).</p>
                      )}
                    </div>
                    <Button onClick={handleUpdateProfile} disabled={updateProfileMutation.isPending} className="w-full min-h-[44px]">
                      {updateProfileMutation.isPending ? 'Updating...' : 'Save Changes'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Right Content - Stats & Bookings */}
          <div className="md:col-span-8 space-y-6 sm:space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 sm:gap-4">
              {[
              { label: 'Bookings', value: bookings?.length || 0, icon: Calendar },
              { label: 'Properties', value: subscriptionInfo?.used || 0, icon: MapPin },
              { label: 'Reviews', value: extraStats?.reviews || 0, icon: CheckCircle2 },
              { label: 'Saved', value: extraStats?.saved || 0, icon: Heart },
            ].map((stat, i) => (
                <div key={i} className="bg-card/50 border border-border/50 rounded-xl p-2 sm:p-4 flex flex-col items-center justify-center text-center hover:bg-card/80 transition-colors cursor-pointer group min-h-[80px] xs:min-h-[90px] sm:min-h-[100px]">
                  <stat.icon className="w-4 h-4 sm:w-6 sm:h-6 text-muted-foreground mb-1 sm:mb-2 group-hover:text-primary transition-colors" />
                  <span className="text-base xs:text-lg sm:text-2xl font-bold">{stat.value}</span>
                  <span className="text-[9px] sm:text-xs text-muted-foreground uppercase tracking-wide truncate w-full px-1">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Subscription Card */}
            <div className="bg-card border border-border rounded-xl p-4 sm:p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 hidden sm:block">
                <Crown className="w-24 h-24 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                      <Crown className="w-5 h-5 text-primary" />
                      My Subscription
                    </h3>
                    <p className="text-muted-foreground text-xs sm:text-sm">Manage your plan and billing.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/plans')} className="min-h-[44px] px-6 w-full sm:w-auto text-xs sm:text-sm">
                    {subscriptionInfo?.plan ? 'Upgrade Plan' : 'View Plans'}
                  </Button>
                </div>

                {subscriptionInfo?.plan ? (
                  <div className="bg-secondary/30 rounded-lg p-3 sm:p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base sm:text-lg">{subscriptionInfo.plan.name}</span>
                        {subscriptionInfo.plan.is_recommended && (
                          <Badge variant="secondary" className="text-[10px] sm:text-xs">PRO</Badge>
                        )}
                      </div>
                      <span className="font-bold text-base sm:text-lg">₹{subscriptionInfo.plan.price_monthly}<span className="text-xs sm:text-sm font-normal text-muted-foreground">/mo</span></span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] sm:text-sm">
                        <span className="text-muted-foreground">Active Listings</span>
                        <span className="font-medium">{subscriptionInfo.used} of {subscriptionInfo.plan.max_listings || '∞'} used</span>
                      </div>
                      <Progress 
                        value={subscriptionInfo.plan.max_listings ? (subscriptionInfo.used / subscriptionInfo.plan.max_listings) * 100 : 0} 
                        className="h-1.5 sm:h-2" 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-secondary/30 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm sm:text-base">Free Plan</p>
                      <p className="text-[11px] sm:text-sm text-muted-foreground">Limited features active.</p>
                    </div>
                    <Button size="sm" onClick={() => navigate('/plans')} className="min-h-[44px] px-6 w-full sm:w-auto text-xs sm:text-sm">Subscribe Now</Button>
                  </div>
                )}
              </div>
            </div>

          {/* Right Content - Activities & Tabs */}
          <div className="lg:col-span-8">
            <Tabs value={defaultTab} onValueChange={handleTabChange} className="w-full">
              <div className="pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                <TabsList className="w-full grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 gap-1 mb-8 bg-card/50 backdrop-blur-sm border border-border/50 p-1 h-auto rounded-xl">
                  <TabsTrigger value="activity" className="px-2 xs:px-3 sm:px-4 py-2 sm:py-3 min-h-[44px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-1.5 xs:gap-2 font-bold text-[9px] xs:text-xs sm:text-sm">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Activity
                  </TabsTrigger>
                  <TabsTrigger value="properties" className="px-2 xs:px-3 sm:px-4 py-2 sm:py-3 min-h-[44px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-1.5 xs:gap-2 font-bold text-[9px] xs:text-xs sm:text-sm">
                    <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Properties
                  </TabsTrigger>
                  <TabsTrigger value="bookings" className="px-2 xs:px-3 sm:px-4 py-2 sm:py-3 min-h-[44px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-1.5 xs:gap-2 font-bold text-[9px] xs:text-xs sm:text-sm">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Bookings
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="px-2 xs:px-3 sm:px-4 py-2 sm:py-3 min-h-[44px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-1.5 xs:gap-2 font-bold text-[9px] xs:text-xs sm:text-sm">
                    <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Payments
                  </TabsTrigger>
                  <TabsTrigger value="leases" className="px-2 xs:px-3 sm:px-4 py-2 sm:py-3 min-h-[44px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-1.5 xs:gap-2 font-bold text-[9px] xs:text-xs sm:text-sm">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Leases
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="px-2 xs:px-3 sm:px-4 py-2 sm:py-3 min-h-[44px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-1.5 xs:gap-2 font-bold text-[9px] xs:text-xs sm:text-sm">
                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Messages
                  </TabsTrigger>
                  <TabsTrigger value="saved" className="px-2 xs:px-3 sm:px-4 py-2 sm:py-3 min-h-[44px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-1.5 xs:gap-2 font-bold text-[9px] xs:text-xs sm:text-sm">
                    <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Saved
                  </TabsTrigger>
                  <TabsTrigger value="availability" className="px-2 xs:px-3 sm:px-4 py-2 sm:py-3 min-h-[44px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-1.5 xs:gap-2 font-bold text-[9px] xs:text-xs sm:text-sm">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Availability
                  </TabsTrigger>
                  <TabsTrigger value="verification" className="px-2 xs:px-3 sm:px-4 py-2 sm:py-3 min-h-[44px] rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all flex items-center justify-center gap-1.5 xs:gap-2 font-bold text-[9px] xs:text-xs sm:text-sm">
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> KYC
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="activity" className="space-y-6">
                {/* Analytics Section */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-card/50 border border-border/50 p-4 sm:p-5 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Views</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-2xl sm:text-3xl font-bold">{ownerProperties?.reduce((acc, p) => acc + (p.views || 0), 0) || 0}</h4>
                      <span className="text-[10px] sm:text-xs text-green-500 font-medium">+12% vs last month</span>
                    </div>
                  </div>
                  
                  <div className="bg-card/50 border border-border/50 p-4 sm:p-5 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500">
                        <UsersIcon className="w-5 h-5" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Inquiries</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-2xl sm:text-3xl font-bold">{ownerProperties?.reduce((acc, p) => acc + (p.leads || 0), 0) || 0}</h4>
                      <span className="text-[10px] sm:text-xs text-green-500 font-medium">+5 new today</span>
                    </div>
                  </div>

                  <div className="bg-card/50 border border-border/50 p-4 sm:p-5 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Visits Verified</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-2xl sm:text-3xl font-bold">{bookings?.filter(b => b.booking_status === 'completed').length || 0}</h4>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Out of {bookings?.length || 0} total</span>
                    </div>
                  </div>
                </div>

                {/* Recent Bookings */}
                <div>
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-center sm:text-left">
    Recent Bookings
  </h3>

  <Button
    variant="ghost"
    size="sm"
    className="min-h-[44px] w-full sm:w-auto text-sm sm:text-base"
    onClick={() => navigate('/services')}
  >
    New Booking
  </Button>
</div>

                  {bookings && bookings.length > 0 ? (
                  <div className="space-y-4 px-2 sm:px-0">
  {bookings.map((booking) => (
    <div
      key={booking.id}
      className="group bg-card hover:bg-card/80 border border-border/50 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row gap-4 transition-all duration-300 hover:shadow-lg hover:border-primary/20"
    >
      {/* Image Section */}
      <div className="w-full md:w-40 h-44 sm:h-52 md:h-auto rounded-lg overflow-hidden shrink-0 relative">
        <img
          src={booking.services?.image_url}
          alt={booking.services?.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <span className="text-white text-xs sm:text-sm font-medium truncate">
            {booking.services?.name}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Header */}
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
            <div className="min-w-0">
              <h4 className="font-bold text-base sm:text-lg md:text-xl text-foreground group-hover:text-primary transition-colors truncate">
                {booking.properties?.title || "Property Visit"}
              </h4>

              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {booking.properties?.address || "Location"}
              </p>
            </div>

            <Badge
              variant={
                booking.booking_status === "confirmed"
                  ? "default"
                  : booking.booking_status === "completed"
                  ? "secondary"
                  : "outline"
              }
              className={cn(
                "self-start sm:self-auto text-[10px] sm:text-xs px-2 py-1",
                booking.booking_status === "confirmed"
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : booking.booking_status === "pending"
                  ? "bg-yellow-500/10 text-yellow-600 border-yellow-200"
                  : ""
              )}
            >
              {booking.booking_status}
            </Badge>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[11px] sm:text-xs font-medium text-muted-foreground border-t border-border/50 pt-3 mt-3">
          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-4">
            <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-2 rounded-md min-h-[36px]">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(booking.visit_date).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>

            <span className="flex items-center gap-1.5 bg-secondary/50 px-3 py-2 rounded-md min-h-[36px]">
              <Clock className="w-3.5 h-3.5" />
              {booking.visit_time}
            </span>
          </div>

          {/* CTA Button */}
          {booking.booking_status === "confirmed" &&
            booking.tenant_id === user.profile.id && (
              <Button
                size="sm"
                variant="default"
                className="w-full sm:w-auto sm:ml-auto min-h-[44px] px-5 text-xs sm:text-sm font-semibold rounded-lg gap-2 shadow-md shadow-primary/20"
                onClick={() => {
                  setSelectedBookingForOTP({
                    id: booking.id,
                    propertyTitle:
                      booking.properties?.title || "Property Visit",
                    date: new Date(
                      booking.visit_date
                    ).toLocaleDateString(),
                    time: booking.visit_time,
                    address: booking.properties?.address || "",
                    tenant_id: booking.tenant_id,
                    owner_id: booking.owner_id,
                  });
                  setIsOTPOpen(true);
                }}
              >
                <ShieldCheck className="w-4 h-4" />
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
                      <Button onClick={() => navigate('/services')} className="min-h-[44px]">
                        Explore Services
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="properties" className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <div>
                    <h3 className="text-xl font-bold">My Listed Properties</h3>
                    <p className="text-sm text-muted-foreground">Manage your active listings and track their performance.</p>
                  </div>
                  <Button onClick={() => navigate('/post-property')} className="w-full sm:w-auto gap-2 min-h-[44px]">
                    <Plus className="w-4 h-4" /> Post New
                  </Button>
                </div>

                {ownerPropertiesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2].map(i => <div key={i} className="h-64 bg-card/50 animate-pulse rounded-2xl border border-border" />)}
                  </div>
                ) : ownerProperties && ownerProperties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {ownerProperties.map((property) => (
                      <div key={property.id} className="space-y-3 group">
                        <PropertyCard property={{
                          ...property,
                          listingType: property.type,
                          propertyType: property.property_category,
                          bhk: property.bedrooms,
                          furnishing: property.furnishing_status,
                          carpetArea: property.area,
                        }} />
                        <div className="flex items-center justify-between px-2">
                          <div className="flex gap-4">
                            <div className="text-xs flex items-center gap-1 text-muted-foreground min-h-[32px]">
                              <Eye className="w-3 h-3" /> {property.views || 0}
                            </div>
                            <div className="text-xs flex items-center gap-1 text-muted-foreground min-h-[32px]">
                              <UsersIcon className="w-3 h-3" /> {property.leads || 0}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={property.is_available ? 'outline' : 'default'}
                            className="h-11 min-h-[44px] text-[10px] font-bold uppercase tracking-wider px-4"
                            onClick={() =>
                              togglePropertyStatusMutation.mutate({ id: property.id, isActive: !property.is_available })
                            }
                          >
                            {property.is_available ? 'Pause listing' : 'Activate listing'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-card/30 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                      <Building2 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No properties listed</h3>
                    <p className="text-muted-foreground max-w-xs mx-auto mb-6">
                      List your first property and reach thousands of verified tenants.
                    </p>
                    <Button onClick={() => navigate('/post-property')} className="min-h-[44px]">
                      Post a Property
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Rent Schedule */}
                  <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        Rent Schedule
                      </h3>
                    </div>
                    
                    <div className="space-y-3 sm:space-y-4">
                      {rentSchedule && rentSchedule.length > 0 ? (
                        rentSchedule.map((rent) => (
                          <div key={rent.id} className="flex items-center justify-between p-3 sm:p-4 bg-secondary/20 rounded-xl border border-border/50">
                            <div className="min-w-0 flex-1 mr-2">
                              <p className="font-bold text-xs sm:text-sm truncate">{rent.properties?.title}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Due: {new Date(rent.due_date).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-primary text-xs sm:text-sm">₹{rent.amount.toLocaleString()}</p>
                              <Badge variant={rent.status === 'paid' ? 'default' : 'outline'} className="text-[10px] h-5">
                                {rent.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-8 text-muted-foreground text-sm">No upcoming rent payments.</p>
                      )}
                    </div>
                  </div>

                  {/* Invoices */}
                  <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-primary" />
                        Recent Invoices
                      </h3>
                    </div>
                    
                    <div className="space-y-3 sm:space-y-4">
                      {invoices && invoices.length > 0 ? (
                        invoices.map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between p-3 sm:p-4 bg-secondary/20 rounded-xl border border-border/50">
                            <div className="min-w-0 flex-1 mr-2">
                              <p className="font-bold text-xs sm:text-sm truncate">{inv.description}</p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-xs sm:text-sm">₹{inv.amount.toLocaleString()}</p>
                              <Badge variant="secondary" className="text-[10px] h-5">
                                {inv.status || 'Paid'}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-8 text-muted-foreground text-sm">No invoices found.</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="leases" className="space-y-6">
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mb-6">
                  <h3 className="text-xl font-bold">My Active Leases</h3>
                </div>

                {userLeases && userLeases.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {userLeases.map((lease) => (
                      <div key={lease.id} className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm hover:border-primary/30 transition-all">
                        <div className="flex justify-between items-start mb-4 gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-base sm:text-lg truncate">{lease.properties?.title}</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{lease.properties?.address}</p>
                          </div>
                          <Badge className="bg-green-500 shrink-0 text-[10px] sm:text-xs">{lease.status}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 py-4 border-y border-border/50 my-4">
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold">Start Date</p>
                            <p className="font-medium text-xs sm:text-sm">{new Date(lease.start_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold">End Date</p>
                            <p className="font-medium text-xs sm:text-sm">{new Date(lease.end_date).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold">Monthly Rent</p>
                            <p className="font-bold text-xs sm:text-sm text-primary">₹{lease.monthly_rent?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-bold">Lease ID</p>
                            <p className="font-medium text-xs sm:text-sm truncate">#{lease.id.slice(0, 8)}</p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 mt-4">
                          <Button variant="outline" size="sm" className="w-full gap-2 min-h-[44px]">
                            <FileText className="w-4 h-4" /> View Agreement
                          </Button>
                          <Button variant="outline" size="sm" className="w-full gap-2 min-h-[44px]">
                            <Info className="w-4 h-4" /> Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-card/30 rounded-2xl border border-dashed border-border">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="font-bold text-lg mb-2">No active leases</h4>
                    <p className="text-muted-foreground max-w-xs mx-auto mb-6">You don't have any active rental agreements at the moment.</p>
                    <Button onClick={() => navigate('/properties')} className="min-h-[44px]">Browse Properties</Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="messages" className="space-y-6">
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm min-h-[400px] flex flex-col">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      Messages
                    </h3>
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <MessageSquare className="w-10 h-10 text-primary" />
                    </div>
                    <h4 className="text-lg font-bold mb-2">No messages yet</h4>
                    <p className="text-muted-foreground max-w-xs">Your conversations with property owners and tenants will appear here.</p>
                    <Button variant="outline" className="mt-6 min-h-[44px]" onClick={() => navigate('/properties')}>
                      Start a Conversation
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="saved" className="space-y-6">
                <div>
                  <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 mb-6">
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
                      {savedProperties.map((property) => (
                        <PropertyCard key={property.id} property={property} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-card/30 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center p-4">
                      <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                        <Building2 className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No saved properties</h3>
                      <p className="text-muted-foreground max-w-xs mx-auto mb-6">
                        Save properties you like to view them later.
                      </p>
                      <Button className="min-h-[44px]" onClick={() => navigate('/properties')}>
                        Browse Properties
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="availability" className="space-y-6">
                 <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
                   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                     <div className="flex items-center gap-3">
                       <div className="p-2 sm:p-3 bg-primary/10 rounded-xl text-primary">
                         <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                       </div>
                       <div>
                         <h3 className="text-lg sm:text-xl font-bold">Manage Visit Availability</h3>
                         <p className="text-xs sm:text-sm text-muted-foreground">Set your available days and time slots for property visits.</p>
                       </div>
                     </div>
                     <Button 
                       variant="outline" 
                       size="sm" 
                       className="gap-2 min-h-[44px] w-full sm:w-auto text-xs sm:text-sm" 
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
                  <div className="grid grid-cols-2 xs:grid-cols-4 md:grid-cols-7 gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={cn(
                        "py-4 min-h-[44px] rounded-xl border text-xs font-bold transition-all flex items-center justify-center",
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
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                    {timeSlots.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between p-3 min-h-[44px] rounded-xl border transition-all relative group/slot",
                          item.active ? "bg-primary/5 border-primary/30" : "bg-background border-border"
                        )}
                      >
                        <div className="flex-1 cursor-pointer flex items-center min-h-[44px]" onClick={() => toggleSlot(item.id)}>
                          <span className={cn("text-xs font-medium", item.active ? "text-primary" : "text-muted-foreground")}>
                            {item.slot}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSlot(item.id)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center"
                          >
                            <span
                              className={cn(
                                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors",
                                item.active ? "border-primary bg-primary" : "border-muted-foreground/30 hover:border-primary/50"
                              )}
                            >
                              {item.active && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </span>
                          </button>
                          {timeSlots.length > 4 && (
                            <button 
                              onClick={() => removeSlot(item.id)}
                              className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover/slot:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Dialog open={isAddSlotOpen} onOpenChange={setIsAddSlotOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full border border-dashed border-border rounded-xl min-h-[44px] text-muted-foreground hover:text-primary">
                        <Plus className="w-4 h-4 mr-2" /> Add custom slot
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Custom Time Slot</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Input 
                              type="time" 
                              value={newSlotStart} 
                              className="min-h-[44px]"
                              onChange={(e) => setNewSlotStart(e.target.value)} 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input 
                              type="time" 
                              value={newSlotEnd} 
                              className="min-h-[44px]"
                              onChange={(e) => setNewSlotEnd(e.target.value)} 
                            />
                          </div>
                        </div>
                        <Button onClick={handleAddCustomSlot} className="w-full min-h-[44px]">Add Slot</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

                   <div className="mt-8 pt-6 border-t border-border/50 bg-secondary/10 px-6 pb-6 rounded-b-2xl">
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
                <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 sm:p-3 bg-primary/10 rounded-xl text-primary">
                        <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold">Owner Verification (KYC)</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">Get verified to list properties and build trust with tenants.</p>
                      </div>
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
                      <Button onClick={() => navigate('/post-property')} variant="default" className="bg-green-600 hover:bg-green-700 min-h-[44px]">
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
                              className="uppercase min-h-[44px]" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="pan">PAN Number</Label>
                            <Input 
                              id="pan" 
                              value={kycForm.panNumber} 
                              onChange={(e) => setKycForm(prev => ({ ...prev, panNumber: e.target.value }))}
                              placeholder="ABCDE1234F" 
                              className="uppercase min-h-[44px]" 
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
                              className="min-h-[44px]"
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
                                  "flex flex-col items-center justify-center p-4 min-h-[80px] border border-dashed rounded-xl transition-colors group relative",
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
                          className="w-full h-12 min-h-[44px] rounded-xl font-bold gap-2" 
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
