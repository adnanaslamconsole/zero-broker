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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { forceDeepClear } from '@/lib/cacheSync';
import { Settings, RefreshCcw, Database } from 'lucide-react';

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
  const { user, logout, updateProfile, uploadAvatar, updateKycStatus } = useAuth();
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

  const { data: ownerProperties, isLoading: ownerPropertiesLoading, refetch: refetchOwnerProperties } = useQuery({
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
 
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
 
  const deletePropertyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'archived' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Listing moved to archives');
      setPropertyToDelete(null);
      refetchOwnerProperties();
    },
    onError: (error: Error) => {
      logError(error, { action: 'property.archive' });
      toast.error('Failed to archive listing');
    }
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
      refetchOwnerProperties();
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

      // 4. Force a local profile update to show pending state immediately
      updateKycStatus('pending');
    },
    onSuccess: () => {
      toast.success('KYC documents submitted for verification!');
      // Reset form and files
      setKycForm({ fullName: '', panNumber: '', aadhaarNumber: '' });
      setKycFiles({ selfie: null, propertyDoc: null, electricityBill: null });
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
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background flex flex-col">
      <Header />
      <main className="flex-1 py-4 pb-28 sm:py-12 container mx-auto px-4 max-w-6xl overflow-x-hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-10">
          <div className="w-full">
            <h1 className="text-xl xs:text-2xl sm:text-4xl font-display font-black text-foreground antialiased tracking-tight">My Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-base font-medium">Manage your properties, bookings, and premium experience.</p>
          </div>
          <Button variant="destructive" onClick={handleLogout} className="hidden sm:inline-flex w-full sm:w-auto gap-2 shadow-sm hover:shadow-lg transition-all min-h-[44px] text-xs sm:text-sm font-bold rounded-xl">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
        
        <div className="grid gap-8 md:grid-cols-12">
          {/* Left Sidebar - Profile Card (4 cols) */}
          <div className="md:col-span-4 space-y-6">
            <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-6 shadow-xl lg:sticky lg:top-24 overflow-hidden relative transition-all duration-300 hover:border-primary/20">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent -z-10" />
              
              <div className="relative flex flex-row sm:flex-col items-center sm:text-center gap-4 sm:gap-0">
                <div className="relative mb-0 sm:mb-4 group/avatar shrink-0">
                  <div className="w-16 h-16 xs:w-20 xs:h-20 sm:w-28 sm:h-28 rounded-full border-4 border-background shadow-2xl overflow-hidden bg-secondary flex items-center justify-center transition-transform duration-500 group-hover/avatar:scale-105">
                    {avatarPreviewUrl ? (
                      <img src={avatarPreviewUrl} alt={user.profile.name} className="w-full h-full object-cover" />
                    ) : user.profile.avatarUrl ? (
                      <img src={user.profile.avatarUrl} alt={user.profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl sm:text-4xl font-black text-muted-foreground">
                        {user.profile.name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                    </div>
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 sm:p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                    disabled={isUploading}
                  >
                    {isUploading ? <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />}
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                <div className="flex-1 text-left sm:text-center min-w-0">
                  <h2 className="text-lg xs:text-xl sm:text-2xl font-black text-foreground mb-1 truncate">{user.profile.name}</h2>
                  <div className="flex flex-col gap-2 items-start sm:items-center w-full mb-0 sm:mb-6">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase text-[8px] xs:text-[10px] tracking-tight font-black px-1.5 xs:px-2 py-0.5">
                        {user.profile.roles?.[0] || 'Member'}
                      </Badge>
                      <Badge variant={user.profile.kycStatus === 'verified' ? 'verified' : 'secondary'} className="gap-1 font-extrabold text-[8px] xs:text-[10px] tracking-tight px-1.5 xs:px-2">
                        {user.profile.kycStatus === 'verified' ? <ShieldCheck className="w-2.5 h-2.5 xs:w-3 xs:h-3" /> : <AlertCircle className="w-2.5 h-2.5 xs:w-3 xs:h-3" />}
                        {user.profile.kycStatus === 'verified' ? 'Verified Owner' : 'Identity Unverified'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 space-y-2 text-left">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20 transition-colors hover:border-primary/30">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><Phone className="w-4 h-4" /></div>
                    <div className="min-w-0 flex-1"><p className="text-[10px] text-muted-foreground font-black uppercase tracking-tight">Phone</p><p className="font-bold text-sm truncate">{user.profile.mobile || 'Not provided'}</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20 transition-colors hover:border-primary/30">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><Mail className="w-4 h-4" /></div>
                    <div className="min-w-0 flex-1"><p className="text-[10px] text-muted-foreground font-black uppercase tracking-tight">Email</p><p className="font-bold text-sm truncate">{user.profile.email}</p></div>
                  </div>
                </div>

                <Dialog open={isEditing} onOpenChange={(o) => { setIsEditing(o); if(!o) setEditAttempted(false); }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full mt-6 gap-2 min-h-[44px] text-xs font-bold rounded-xl border-border/50 hover:bg-secondary/50">
                      <Edit2 className="w-4 h-4" /> Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="font-black text-2xl tracking-tight">Edit Profile</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4 px-1">
                      <div className="space-y-2">
                        <Label htmlFor="edit-name" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-1">Full Name</Label>
                        <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-xl min-h-[44px] font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-mobile" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground px-1">Mobile Number</Label>
                        <Input id="edit-mobile" value={editMobile} onChange={(e) => setEditMobile(e.target.value)} className="rounded-xl min-h-[44px] font-bold" placeholder="+91 99999 99999" />
                      </div>
                      <Button onClick={handleUpdateProfile} className="w-full min-h-[48px] rounded-xl font-bold text-base mt-2" disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? 'Updating...' : 'Save Profile Changes'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Right Content - Full Width Grid (8 cols) */}
          <div className="md:col-span-8 space-y-8">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: 'Shortlisted', value: extraStats?.saved || 0, icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                { label: 'My Listings', value: ownerProperties?.length || 0, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Visits', value: bookings?.length || 0, icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                { label: 'Trust Score', value: user.profile.trustScore || 0, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              ].map((stat, i) => (
                <div key={stat.label} className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 flex flex-col items-center sm:items-start shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30 group">
                  <div className={cn("p-2 rounded-xl mb-3 transition-colors", stat.bg)}>
                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-foreground antialiased tracking-tight group-hover:text-primary transition-colors">{stat.value}</div>
                  <div className="text-[10px] sm:text-xs font-black text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Premium Experience Card */}
            <div className="bg-card border border-border/50 rounded-2xl p-6 relative overflow-hidden group/premium">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/premium:opacity-10 transition-opacity"><Crown className="w-32 h-32 rotate-12" /></div>
              <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-black uppercase text-[10px] tracking-widest px-2 py-0.5">Premium Feature</Badge>
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-foreground">Zero Broker Pro</h3>
                  <p className="text-muted-foreground text-sm font-medium">Unlock priority listings and identity verification.</p>
                </div>
                <Button variant="default" onClick={() => navigate('/plans')} className="w-full sm:w-auto px-8 min-h-[48px] rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                  View Plans
                </Button>
              </div>
            </div>

            {/* Dashboard Tabs */}
            <Tabs defaultValue={defaultTab} onValueChange={handleTabChange} className="w-full">
              <div className="relative mb-6 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
                <TabsList className="w-full h-auto p-1.5 bg-secondary/50 backdrop-blur-sm rounded-2xl flex overflow-x-auto no-scrollbar justify-start items-center gap-1.5 border border-border/40">
                  {['activity', 'properties', 'bookings', 'saved', 'availability', 'verification', 'settings'].map((tab) => (
                    <TabsTrigger key={tab} value={tab} className="rounded-xl py-3 px-6 text-xs font-black uppercase tracking-widest min-w-[140px] transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25">
                      {tab}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="activity">
                <div className="bg-card/30 border-2 border-dashed border-border/50 rounded-3xl py-12 px-6 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-bold">Your recent activity feed will appear here.</p>
                </div>
              </TabsContent>

              <TabsContent value="properties" className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                  <h3 className="text-xl font-black tracking-tight">Active Listings</h3>
                  <Button onClick={() => navigate('/post-property')} className="w-full sm:w-auto gap-2 min-h-[44px] rounded-xl font-bold">
                    <Plus className="w-4 h-4" /> Post New
                  </Button>
                </div>
                {ownerProperties?.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {ownerProperties.filter(p => (p as any).status !== 'archived').map(p => (
                      <PropertyCard 
                        key={p.id} 
                        property={{...p, listingType: (p as any).type, bhk: (p as any).bedrooms, carpetArea: (p as any).area} as any} 
                        onDelete={(id) => setPropertyToDelete(id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-secondary/20 rounded-2xl border-2 border-dashed border-border/50">
                    <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="font-bold text-muted-foreground">No properties listed yet.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="bookings" className="space-y-6">
                <h3 className="text-xl font-black tracking-tight mb-6">Upcoming Scheduled Visits</h3>
                {bookings?.length ? (
                  <div className="space-y-4">
                    {bookings.map(booking => (
                      <div key={booking.id} className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col md:flex-row gap-5 items-center transition-all hover:bg-card/80 hover:border-primary/30 group">
                         <div className="w-full md:w-32 h-24 rounded-xl overflow-hidden shrink-0"><img src={booking.services?.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /></div>
                         <div className="flex-1 min-w-0">
                           <h4 className="font-black text-lg truncate">{booking.properties?.title || 'Visit Confirmation'}</h4>
                           <div className="flex flex-wrap gap-4 mt-2">
                             <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold"><Calendar className="w-4 h-4" /> {new Date(booking.visit_date).toLocaleDateString()}</div>
                             <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold"><Clock className="w-4 h-4" /> {booking.visit_time}</div>
                           </div>
                         </div>
                         <Badge className="font-black uppercase tracking-widest text-[10px] px-3 py-1 rounded-lg">{booking.booking_status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-secondary/20 rounded-2xl">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="font-bold text-muted-foreground">No bookings scheduled.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="saved" className="space-y-8">
                <h3 className="text-xl font-black tracking-tight mb-4">Your Shortlisted Dream Homes</h3>
                {savedProperties?.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {savedProperties.map(p => <PropertyCard key={p.id} property={p} />)}
                  </div>
                ) : (
                  <div className="text-center py-24 bg-card/30 rounded-3xl border-2 border-dashed border-border/50">
                    <Heart className="w-16 h-16 text-rose-500/20 mx-auto mb-6" />
                    <h4 className="text-lg font-black text-foreground mb-2">No bookmarks yet</h4>
                    <p className="text-muted-foreground max-w-xs mx-auto mb-8 font-medium">Heart properties you like to see them organized here.</p>
                    <Button onClick={() => navigate('/properties')} className="min-h-[48px] rounded-xl font-bold uppercase text-xs tracking-widest">Start Exploring</Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="availability" className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-foreground">Visit Availability</h3>
                    <p className="text-sm text-muted-foreground font-medium">Control when potential tenants can visit your properties.</p>
                  </div>
                  <Button onClick={() => saveAvailabilityMutation.mutate()} disabled={saveAvailabilityMutation.isPending} className="w-full sm:w-auto min-h-[44px] rounded-xl font-bold bg-primary shadow-lg shadow-primary/20">
                    {saveAvailabilityMutation.isPending ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>

                <div className="grid gap-6">
                  {/* Days Section */}
                  <div className="bg-card border border-border/50 rounded-2xl p-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Available Days</h4>
                    <div className="flex flex-wrap gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-black transition-all border-2",
                            availableDays.includes(day) 
                              ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20 scale-105" 
                              : "bg-secondary/30 border-transparent text-muted-foreground hover:border-border"
                          )}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Slots Section */}
                  <div className="bg-card border border-border/50 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Time Slots</h4>
                      <Dialog open={isAddSlotOpen} onOpenChange={setIsAddSlotOpen}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-wider text-primary hover:text-primary/80">
                            <Plus className="w-3 h-3 mr-1" /> Add Custom
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-2xl sm:max-w-[400px]">
                          <DialogHeader><DialogTitle className="font-black text-xl tracking-tight">Add Custom Slot</DialogTitle></DialogHeader>
                          <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Start Time</Label>
                              <Input type="time" value={newSlotStart} onChange={e => setNewSlotStart(e.target.value)} className="rounded-xl font-bold h-12" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">End Time</Label>
                              <Input type="time" value={newSlotEnd} onChange={e => setNewSlotEnd(e.target.value)} className="rounded-xl font-bold h-12" />
                            </div>
                          </div>
                          <Button onClick={handleAddCustomSlot} className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest">Add Time Slot</Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                      {timeSlots.map(slot => (
                        <div key={slot.id} className={cn(
                          "relative flex items-center justify-between p-4 rounded-xl border-2 transition-all group",
                          slot.active ? "bg-primary/5 border-primary/30" : "bg-secondary/10 border-transparent opacity-60"
                        )}>
                          <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleSlot(slot.id)}>
                            <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors", slot.active ? "border-primary bg-primary" : "border-muted-foreground")}>
                              {slot.active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span className={cn("text-xs font-bold", slot.active ? "text-foreground" : "text-muted-foreground")}>{slot.slot}</span>
                          </div>
                          <button onClick={() => removeSlot(slot.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="verification" className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-foreground">Identity & Trust</h3>
                    <p className="text-sm text-muted-foreground font-medium">Verify your identity to build trust and unlock direct owner listings.</p>
                  </div>
                  {user.profile.kycStatus === 'verified' && (
                    <Badge variant="verified" className="bg-emerald-500 text-white h-10 px-4 rounded-xl text-xs font-black uppercase tracking-widest gap-2">
                       <ShieldCheck className="w-4 h-4" /> Verified Citizen
                    </Badge>
                  )}
                </div>

                {user.profile.kycStatus === 'verified' ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-black text-foreground mb-1">Your Identity is Verified</h4>
                    <p className="text-muted-foreground max-w-sm mx-auto text-sm font-medium">Thank you for helping us maintain a secure community. You now have full access to premium owner features.</p>
                  </div>
                ) : user.profile.kycStatus === 'pending' ? (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-amber-500/20">
                      <Clock className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-black text-foreground mb-1">Verification in Progress</h4>
                    <p className="text-muted-foreground max-w-sm mx-auto text-sm font-medium">Our team is reviewing your documents. This typically takes 24-48 hours. We'll notify you once complete.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Documented Full Name</Label>
                          <Input 
                            placeholder="John Doe" 
                            value={kycForm.fullName}
                            onChange={e => setKycForm(p => ({ ...p, fullName: e.target.value }))}
                            className="h-12 rounded-xl font-bold bg-secondary/20" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">PAN Number</Label>
                          <Input 
                            placeholder="ABCDE1234F" 
                            style={{ textTransform: 'uppercase' }}
                            value={kycForm.panNumber}
                            onChange={e => setKycForm(p => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
                            className="h-12 rounded-xl font-bold bg-secondary/20" 
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Aadhaar Number</Label>
                        <Input 
                          placeholder="0000 0000 0000" 
                          value={kycForm.aadhaarNumber}
                          onChange={e => setKycForm(p => ({ ...p, aadhaarNumber: e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim().substring(0, 14) }))}
                          className="h-12 rounded-xl font-bold bg-secondary/20" 
                        />
                      </div>

                      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 py-2">
                        {[
                          { id: 'selfie', label: 'Face Verification', icon: Camera, ref: selfieInputRef },
                          { id: 'propertyDoc', label: 'Property Deed', icon: FileText, ref: propertyDocInputRef },
                          { id: 'electricityBill', label: 'Electricity Bill', icon: Zap, ref: electricityBillInputRef },
                        ].map(doc => (
                          <div key={doc.id} 
                            onClick={() => doc.ref.current?.click()}
                            className={cn(
                              "flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer hover:border-primary/50 group/doc shrink-0",
                              kycFiles[doc.id as keyof typeof kycFiles] ? "bg-primary/5 border-primary/40 shadow-inner" : "bg-secondary/20 border-border/50"
                            )}
                          >
                            <input type="file" ref={doc.ref} className="hidden" accept="image/*,.pdf" onChange={e => handleKycFileChange(doc.id as any, e)} />
                            <div className={cn("p-3 rounded-2xl mb-3 transition-transform group-hover/doc:scale-110", kycFiles[doc.id as keyof typeof kycFiles] ? "bg-primary/20 text-primary" : "bg-muted-foreground/10 text-muted-foreground")}>
                              <doc.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-center truncate px-2 w-full">{kycFiles[doc.id as keyof typeof kycFiles]?.name || doc.label}</span>
                            {kycFiles[doc.id as keyof typeof kycFiles] && <Badge variant="secondary" className="mt-2 text-[8px] h-4 bg-primary/10 text-primary font-black">SELECTED</Badge>}
                          </div>
                        ))}
                      </div>

                      <Button 
                        onClick={() => submitKycMutation.mutate()} 
                        disabled={submitKycMutation.isPending || !kycForm.fullName || !kycForm.panNumber || !kycForm.aadhaarNumber} 
                        className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 relative overflow-hidden group/btn"
                      >
                        <div className={cn("absolute inset-0 bg-primary/10 -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-500", submitKycMutation.isPending && "translate-x-0 animate-pulse")} />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {submitKycMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                              Uploading Documents...
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4" />
                              Submit Verification Request
                            </>
                          )}
                        </span>
                      </Button>
                      
                      <p className="text-[10px] text-center text-muted-foreground font-medium px-4 opacity-70">
                        By submitting, you agree to our <span className="text-primary cursor-pointer hover:underline">document processing policy</span>. Data is encrypted and stored securely for verification purposes only.
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-6 h-6 text-foreground" />
                  <h3 className="text-xl font-black tracking-tight">Application Settings</h3>
                </div>

                <div className="grid gap-6">
                  <div className="bg-card border border-border/50 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Database className="w-24 h-24 rotate-12" /></div>
                    <div className="relative z-10">
                      <h4 className="text-lg font-black text-foreground mb-2">Repair Application</h4>
                      <p className="text-muted-foreground text-sm font-medium mb-6 max-w-md">
                        If you're experiencing issues with stale data, loading errors, or API timeouts, 
                        using this tool will safely clear all local cache and refresh the application.
                      </p>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="gap-2 border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl font-bold">
                            <RefreshCcw className="w-4 h-4" /> Repair & Clear Cache
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-2xl sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-black text-xl tracking-tight">Deep System Repair</DialogTitle>
                            <DialogDescription className="font-medium pt-2">
                              This will clear all LocalStorage, SessionStorage, and TanStack Query Cache. 
                              You will be logged out and the page will reload. 
                              Use this as a last resort to fix persistent errors.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter className="pt-4">
                            <Button variant="destructive" onClick={() => forceDeepClear()} className="w-full h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-destructive/20">
                              Confirm Deep Repair
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
      </main>
      <Footer />
      {selectedBookingForOTP && (
        <BookingOTPDialog
          booking={selectedBookingForOTP}
          open={isOTPOpen}
          onOpenChange={setIsOTPOpen}
          onComplete={() => toast.success('Visit verified successfully')}
        />
      )}
 
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!propertyToDelete} onOpenChange={(open) => !open && setPropertyToDelete(null)}>
        <DialogContent className="rounded-2xl sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-black text-xl tracking-tight flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Archive Listing?
            </DialogTitle>
            <DialogDescription className="font-medium pt-2">
              This will hide your property from all search results and active listings. You can still access historical visit data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setPropertyToDelete(null)}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => propertyToDelete && deletePropertyMutation.mutate(propertyToDelete)}
              disabled={deletePropertyMutation.isPending}
              className="rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-destructive/20"
            >
              {deletePropertyMutation.isPending ? 'Archiving...' : 'Confirm Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
