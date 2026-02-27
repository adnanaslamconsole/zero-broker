import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Calendar, MapPin, Clock, Edit2, Camera, LogOut, Shield, Phone, Mail, User, Upload, Trash2, CheckCircle2, Crown, Zap, Heart } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [demoAvatarUrl, setDemoAvatarUrl] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const [isEditing, setIsEditing] = useState(false);
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


  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: async () => {
      if (!user || user.profile.isDemo) return [];
      const { data, error } = await supabase
        .from('service_bookings')
        .select('*, services(name, image_url)')
        .eq('user_id', user.profile.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !user.profile.isDemo,
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
    queryKey: ['profile-extra-stats', user?.profile.id],
    queryFn: async () => {
      if (!user) return { reviews: 0, saved: 0 };

      // In a real app, these would be real queries
      // For now, we'll try to fetch if they exist, or return 0
      const [reviewsRes, savedRes] = await Promise.all([
        supabase.from('property_reviews').select('*', { count: 'exact', head: true }).eq('user_id', user.profile.id),
        supabase.from('saved_properties').select('*', { count: 'exact', head: true }).eq('user_id', user.profile.id)
      ]);

      return {
        reviews: reviewsRes.count || 0,
        saved: savedRes.count || 0
      };
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
                
                <div className="flex gap-2 justify-center">
                  <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase text-[10px] tracking-wider">
                    {user.profile.roles?.[0] || 'Member'}
                  </Badge>
                  {user.profile.kycStatus === 'verified' && (
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600 border-transparent gap-1">
                      <Shield className="w-3 h-3" /> Verified
                    </Badge>
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

            {/* Recent Bookings */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Recent Activities</h3>
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
                              <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{booking.services?.name}</h4>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {booking.city}
                              </p>
                            </div>
                            <Badge 
                              variant={
                                booking.status === 'confirmed' ? 'default' :
                                booking.status === 'completed' ? 'secondary' :
                                'outline'
                              }
                              className={
                                booking.status === 'confirmed' ? 'bg-green-500 hover:bg-green-600' :
                                booking.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-200' : ''
                              }
                            >
                              {booking.status}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                            {booking.address}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground border-t border-border/50 pt-3 mt-auto">
                          <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded">
                            <Calendar className="w-3 h-3" />
                            {new Date(booking.booking_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded">
                            <Clock className="w-3 h-3" />
                            {booking.booking_time}
                          </span>
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
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

