import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Building2, 
  MapPin, 
  Home, 
  IndianRupee, 
  CheckCircle2,
  Loader2,
  Upload,
  X,
  AlertCircle,
  Crown
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LocationSearch } from '@/components/property/LocationSearch';
import { getUserFriendlyErrorMessage, logError } from '@/lib/errors';

import { offlineStorage } from '@/lib/offlineStorage';

// Form Schema
const propertySchema = z.object({
  title: z.string()
    .min(1, 'Please enter a catchy title for your property')
    .min(5, 'Title is too short (minimum 10 characters recommended)')
    .max(100, 'Title is too long (maximum 100 characters)'),
  description: z.string()
    .min(1, 'Please provide a detailed description of your property')
    .min(20, 'Description is too brief. Mention features, neighborhood, etc.')
    .max(2000, 'Description exceeds 2000 characters'),
  type: z.enum(['rent', 'sale', 'pg', 'commercial'], {
    required_error: 'Please select whether you want to Rent, Sell, or list as PG',
  }),
  property_category: z.string().min(1, 'Please select a property category (e.g. Apartment, Villa)'),
  price: z.string()
    .min(1, 'Expected price or rent is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Price must be a valid positive amount (e.g. 25000)'),
  city: z.string().min(1, 'City is required for location tagging'),
  locality: z.string().min(1, 'Locality or landmark is required to help tenants find you'),
  address: z.string()
    .min(1, 'Full address is required for verification')
    .min(5, 'Please provide a more complete address'),
  bedrooms: z.string()
    .transform((val) => Number(val))
    .refine(val => val >= 1, 'Mention at least 1 bedroom (or use 0 for studio)')
    .optional(),
  bathrooms: z.string()
    .transform((val) => Number(val))
    .refine(val => val >= 1, 'Mention at least 1 bathroom')
    .optional(),
  area: z.string()
    .min(1, 'Carpet area is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Area must be a positive number in sq.ft'),
  furnishing_status: z.enum(['furnished', 'semi-furnished', 'unfurnished'], {
    required_error: 'Please select the furnishing status',
  }),
  amenities: z.array(z.string()).optional(),
});

type PropertyFormValues = z.infer<typeof propertySchema>;

const amenitiesList = [
  'Parking', 'Lift', 'Power Backup', 'Gym', 'Swimming Pool', 
  'Security', 'Club House', 'Park', 'Wifi', 'Gas Pipeline', 
  'AC', 'Intercom'
];

const steps = [
  { id: 1, title: 'Basic Info', icon: Building2 },
  { id: 2, title: 'Location', icon: MapPin },
  { id: 3, title: 'Details', icon: Home },
  { id: 4, title: 'Pricing & Photos', icon: IndianRupee },
];

export default function PostProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null);

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'rent',
      property_category: 'apartment',
      price: '',
      city: '',
      locality: '',
      address: '',
      bedrooms: 2,
      bathrooms: 2,
      area: '',
      furnishing_status: 'semi-furnished',
      amenities: [],
    },
    mode: 'onChange',
  });

  // Load draft on mount
  useEffect(() => {
    const draft = offlineStorage.getDraft();
    if (draft && draft.data) {
      const draftData = draft.data as Record<string, unknown>;
      // If a draft exists, check if user wants to restore it
      const restoreDraft = () => {
        form.reset(draftData as never);
        const step = draftData.step;
        if (typeof step === 'number') setCurrentStep(step);
        toast.success('Draft restored', {
          description: 'We found an unsaved property listing and restored it for you.'
        });
      };

      // Auto-restore for now, or could show a prompt
      restoreDraft();
    }
  }, []);

  // Auto-save draft on form changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      offlineStorage.saveDraft({ ...value, step: currentStep }, user?.profile.id);
    });
    return () => subscription.unsubscribe();
  }, [form.watch, currentStep, user]);

  // Fetch subscription & limits
  const { data: subscriptionInfo, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription-limits', user?.profile.id, user?.profile.isPaid],
    queryFn: async () => {
      if (!user) {
        return {
          plan: null,
          used: 0,
          remaining: 0
        };
      }

      // Handle demo user
      if (user.profile.isDemo) {
        // If it's the paid demo owner, mock a Plus plan
        if (user.profile.isPaid) {
          // Count real properties for demo user to show correct usage
          const { count } = await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', user.profile.id)
            .neq('status', 'archived');

          return {
            plan: {
              name: 'Plus',
              max_listings: 10,
              price: 999
            },
            used: count || 0,
            remaining: Math.max(0, 10 - (count || 0))
          };
        }
        return {
          plan: null,
          used: 0,
          remaining: 0
        };
      }
      
      // 1. Get Subscription + Plan
      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('*, pricing_plans(*)')
        .eq('user_id', user.profile.id)
        .eq('status', 'active')
        .maybeSingle();
      
      // 2. Count active listings
      const { count } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.profile.id)
        .neq('status', 'archived');

      return {
        plan: sub?.pricing_plans,
        used: count || 0,
        remaining: sub?.pricing_plans ? (sub.pricing_plans.max_listings - (count || 0)) : 0
      };
    },
    enabled: !!user,
  });

  const maxListings = subscriptionInfo?.plan?.max_listings || 0;
  const usedListings = subscriptionInfo?.used || 0;
  const isLimitReached = !!user && maxListings > 0 && usedListings >= maxListings;
  const hasNoPlan = !!user && !isLoadingSubscription && !subscriptionInfo?.plan && !user.profile.isDemo;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      
      // God Mode Check: File Size & Type (Category 4)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      const validFiles = fileArray.filter(file => {
        if (!file.type.startsWith('image/')) {
          toast.error(`Invalid file type: ${file.name}. Only images are allowed.`);
          return false;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`File too large: ${file.name}. Max size is 10MB.`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      setUploadedImages(prev => [...prev, ...validFiles]);

      // Create preview URLs
      const newUrls = validFiles.map(file => URL.createObjectURL(file));
      setImageUrls(prev => [...prev, ...newUrls]);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImagesToStorage = async () => {
    if (uploadedImages.length === 0) return [];
    
    // Bypass for demo user
    if (user?.profile.isDemo) {
      return imageUrls; // Return local preview URLs for demo
    }

    const uploadPromises = uploadedImages.map(async (file) => {
      console.log(`Starting upload for file: ${file.name}`);
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user?.profile.id}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error(`Upload error for file ${file.name}:`, uploadError);
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error("Storage bucket 'property-images' not found. Please create it in your Supabase dashboard.");
        }
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('property-images')
        .getPublicUrl(data.path);

      console.log(`Upload success for file ${file.name}. URL: ${publicUrlData.publicUrl}`);
      return publicUrlData.publicUrl;
    });

    try {
      console.log(`Parallelizing upload for ${uploadedImages.length} images...`);
      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error) {
      console.error('Fatal error in parallel uploadImagesToStorage:', error);
      toast.error('Failed to upload images. Please try again.');
      throw error;
    } finally {
      setUploadingImages(false);
    }
  };

  const onSubmit = async (data: PropertyFormValues) => {
    console.log('onSubmit triggered with data:', data);
    if (!user) {
      console.error('Submission failed: No user found');
      toast.error('You must be logged in to post a property');
      navigate('/login');
      return;
    }

    // Validation for photos & location (God Mode Category 3 & 4)
    if (!selectedLocation && !user.profile.isDemo) {
      console.warn('Submission blocked: No location coordinates');
      toast.error('Please select a specific location from the suggestions for your property');
      setCurrentStep(2); // Jump back to location step
      return;
    }

    if (uploadedImages.length === 0 && !user.profile.isDemo) {
      console.warn('Submission blocked: No images uploaded');
      toast.error('Please upload at least one property photo');
      return;
    }

    console.log('Setting isSubmitting to true');
    setIsSubmitting(true);

    try {
      console.log('Starting submission flow for user:', user.profile.id);
      console.log('Step 1: Uploading images...');
      const uploadedUrls = await uploadImagesToStorage();
      console.log('Step 1 Complete: Images uploaded:', uploadedUrls);

      // Handle non-paid demo user submission (mock only)
      if (user.profile.isDemo && !user.profile.isPaid) {
        console.log('Demo mode detected (Free), simulating delay...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        toast.success('Demo Property posted successfully!');
        navigate('/properties');
        return;
      }

      console.log('Step 2: Inserting property into Supabase...');
      const propertyPayload = {
        owner_id: user.profile.id,
        title: data.title,
        description: data.description,
        type: data.type,
        property_category: data.property_category,
        price: Number(data.price),
        city: data.city,
        locality: data.locality,
        address: data.address,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        area: Math.round(Number(data.area)),
        furnishing_status: data.furnishing_status,
        amenities: data.amenities || [],
        images: uploadedUrls,
        status: 'active',
        verification_status: 'pending',
        is_available: true,
        is_verified: false,
        latitude: selectedLocation?.lat,
        longitude: selectedLocation?.lon,
      };
      
      console.log('Payload:', propertyPayload);
      
      const { error, data: insertedData } = await supabase
        .from('properties')
        .insert(propertyPayload)
        .select()
        .single();

      if (error) {
        console.error('Step 2 Failed: Database error:', error);
        logError(error, { action: 'property.create' });
        throw new Error(getUserFriendlyErrorMessage(error, { action: 'property.create' }) || 'Failed to post property');
      }

      console.log('Step 2 Complete: Property inserted:', insertedData);
      console.log('Step 3: Invalidating caches and clearing draft...');
      
      toast.success('Property posted successfully!');
      
      queryClient.invalidateQueries({ queryKey: ['subscription-limits'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['owner-properties'] });

      offlineStorage.clearDraft();
      console.log('Step 3 Complete: Draft cleared. Navigating to properties list...');
      
      navigate('/properties');
    } catch (error) {
      console.error('CATCH: Submission process failed:', error);
      logError(error, { action: 'property.create' });
      toast.error(getUserFriendlyErrorMessage(error, { action: 'property.create' }) || 'Failed to post property');
    } finally {
      console.log('FINALLY: Submission flow finished. Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = {
      1: ['title', 'description', 'type', 'property_category'],
      2: ['city', 'locality', 'address'],
      3: ['bedrooms', 'bathrooms', 'area', 'furnishing_status'],
      4: ['price'],
    }[currentStep] as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      console.log('Step', currentStep, 'validated. Moving to next.');
      setCurrentStep(prev => prev + 1);
      // Scroll to top of form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      console.error('Validation failed for fields:', fieldsToValidate);
      toast.error('Please fix the errors before continuing');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background pb-28 pt-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-10 text-center sm:text-left">
          <Badge variant="outline" className="mb-3 px-3 py-1 bg-primary/5 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest">Listing Portal</Badge>
          <h1 className="text-3xl sm:text-5xl font-display font-black text-foreground antialiased tracking-tight">Post Your Property</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-lg font-medium max-w-2xl">Connect with thousands of verified tenants directly without middleman charges.</p>
        </div>

        {/* Subscription Limits Alert */}
        {!!user && !isLoadingSubscription && (
          <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
            {hasNoPlan ? (
              <div className="bg-destructive/5 border-2 border-dashed border-destructive/20 rounded-3xl p-8 flex flex-col items-center text-center gap-4">
                <div className="p-4 bg-destructive/10 rounded-full text-destructive"><AlertCircle className="h-8 w-8" /></div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black tracking-tight text-foreground">No Active Plan Found</h3>
                  <p className="text-muted-foreground text-sm font-medium">You need an active subscription to list properties on Zero Broker.</p>
                </div>
                <Button variant="destructive" size="lg" onClick={() => navigate('/plans')} className="px-8 h-12 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-destructive/20">
                  Upgrade My Account
                </Button>
              </div>
            ) : (
              <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                  <Crown className="w-24 h-24 rotate-12" />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Crown className="w-5 h-5" /></div>
                      <div>
                        <h4 className="font-black text-lg tracking-tight">{subscriptionInfo?.plan?.name} Plan Active</h4>
                        <p className="text-xs text-muted-foreground font-medium">{maxListings - usedListings} listing slots remaining</p>
                      </div>
                    </div>
                    {isLimitReached && (
                      <Button variant="outline" size="sm" onClick={() => navigate('/plans')} className="w-full sm:w-auto h-10 rounded-xl font-bold bg-background shadow-sm hover:shadow-md transition-all">
                        Upgrade To Plus
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Progress value={(usedListings / maxListings) * 100} className="h-2 sm:h-2.5 rounded-full bg-secondary" />
                    <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      <span>Used: {usedListings}</span>
                      <span>Total: {maxListings}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Steps Indicator - Premium Redesign */}
        {!isLimitReached && (
          <div className="mb-12 relative px-4">
            <div className="absolute left-10 right-10 top-5 h-0.5 bg-border -z-10 hidden sm:block" />
            <div className="flex items-center justify-between">
              {steps.map((step) => (
                <div 
                  key={step.id}
                  className={cn(
                    "flex flex-col items-center gap-3 transition-all duration-500",
                    step.id <= currentStep ? "opacity-100 scale-100" : "opacity-40 scale-95"
                  )}
                >
                  <div 
                    className={cn(
                      "w-10 h-10 xxs:w-11 xxs:h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center border-2 transition-all duration-300 relative",
                      step.id < currentStep 
                        ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : step.id === currentStep
                        ? "bg-background border-primary text-primary shadow-xl shadow-primary/10"
                        : "bg-secondary/30 border-transparent text-muted-foreground"
                    )}
                  >
                    {step.id < currentStep ? (
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : (
                      <step.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                    {step.id === currentStep && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest hidden sm:block",
                    step.id === currentStep ? "text-primary" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLimitReached ? (
          <Card className="border-border/40 shadow-2xl shadow-primary/5 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden bg-card/80 backdrop-blur-md">
            <CardContent className="p-5 sm:p-12">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
                  {/* Step 1: Basic Info */}
                  {currentStep === 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-8"
                    >
                      <div className="space-y-1">
                        <h2 className="text-2xl font-black tracking-tight text-primary">Basic Information</h2>
                        <p className="text-muted-foreground text-sm font-medium">Start with the essentials. What are you listing?</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Purpose of Listing <span className="text-destructive">*</span></FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-14 rounded-2xl border-border/50 bg-background/50 focus:ring-primary/20 transition-all font-bold">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-2xl p-2">
                                  <SelectItem value="rent" className="rounded-xl py-3 font-bold">Rent Out</SelectItem>
                                  <SelectItem value="sale" className="rounded-xl py-3 font-bold">Sell</SelectItem>
                                  <SelectItem value="pg" className="rounded-xl py-3 font-bold">List as PG</SelectItem>
                                  <SelectItem value="commercial" className="rounded-xl py-3 font-bold">List Commercial</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="property_category"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Property Category <span className="text-destructive">*</span></FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-14 rounded-2xl border-border/50 bg-background/50 focus:ring-primary/20 transition-all font-bold">
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-2xl p-2">
                                  <SelectItem value="apartment" className="rounded-xl py-3 font-bold">Apartment</SelectItem>
                                  <SelectItem value="villa" className="rounded-xl py-3 font-bold">Villa / House</SelectItem>
                                  <SelectItem value="plot" className="rounded-xl py-3 font-bold">Plot / Land</SelectItem>
                                  <SelectItem value="office" className="rounded-xl py-3 font-bold">Office Space</SelectItem>
                                  <SelectItem value="shop" className="rounded-xl py-3 font-bold">Shop / Showroom</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Property Title <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g. 2 BHK Ultra Luxury Garden View Apartment" 
                                className="h-14 rounded-2xl border-border/50 bg-background/50 focus:ring-primary/20 transition-all font-bold px-6"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription className="text-[10px] font-medium italic">
                              * A descriptive title gets 40% more engagement.
                            </FormDescription>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Property Description <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the soul of your property. Mention highlights like Vastu compliance, morning sun, quiet neighborhood, or premium fittings." 
                                className="min-h-[160px] rounded-3xl border-border/50 bg-background/50 focus:ring-primary/20 transition-all font-medium p-6 resize-none"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}

                  {/* Step 2: Location */}
                  {currentStep === 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-8"
                    >
                      <div className="space-y-1">
                        <h2 className="text-2xl font-black tracking-tight">Location Details</h2>
                        <p className="text-muted-foreground text-sm font-medium">Where is your property located?</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select City <span className="text-destructive">*</span></FormLabel>
                              <FormControl>
                                <LocationSearch 
                                  value={field.value} 
                                  onChange={field.onChange}
                                  onLocationSelect={(loc) => {
                                    setSelectedLocation({ lat: loc.lat, lon: loc.lon });
                                  }}
                                />
                              </FormControl>
                              <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="locality"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Locality / Area <span className="text-destructive">*</span></FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g. Near Central Park" 
                                  className="h-14 rounded-2xl border-border/50 bg-background/50 focus:ring-primary/20 transition-all font-bold px-6"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Full Address <span className="text-destructive">*</span></FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter house number, building name, street, etc." 
                                className="min-h-[120px] rounded-3xl border-border/50 bg-background/50 focus:ring-primary/20 transition-all font-medium p-6 resize-none"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}

                  {/* Step 3: Details */}
                  {currentStep === 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-8"
                    >
                      <div className="space-y-1">
                        <h2 className="text-2xl font-black tracking-tight">Internal Specifications</h2>
                        <p className="text-muted-foreground text-sm font-medium">BHK configuration, area and furnishing status.</p>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                        <FormField
                          control={form.control}
                          name="bedrooms"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Bedrooms <span className="text-destructive">*</span></FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                                  <Input type="number" className="h-14 rounded-2xl border-border/50 bg-background/50 pl-12 font-bold" placeholder="2" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bathrooms"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Total Bathrooms <span className="text-destructive">*</span></FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 flex items-center justify-center">🛁</div>
                                  <Input type="number" className="h-14 rounded-2xl border-border/50 bg-background/50 pl-12 font-bold" placeholder="2" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="area"
                          render={({ field }) => (
                            <FormItem className="space-y-3 col-span-2 lg:col-auto">
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Carpet Area (sq.ft) <span className="text-destructive">*</span></FormLabel>
                              <FormControl>
                                <Input type="number" className="h-14 rounded-2xl border-border/50 bg-background/50 px-6 font-bold" placeholder="1200" {...field} />
                              </FormControl>
                              <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="furnishing_status"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Furnishing Status <span className="text-destructive">*</span></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-14 rounded-2xl border-border/50 bg-background/50 focus:ring-primary/20 transition-all font-bold">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-2xl p-2">
                                <SelectItem value="furnished" className="rounded-xl py-3 font-bold">Fully Furnished</SelectItem>
                                <SelectItem value="semi-furnished" className="rounded-xl py-3 font-bold">Semi Furnished</SelectItem>
                                <SelectItem value="unfurnished" className="rounded-xl py-3 font-bold">Unfurnished</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="amenities"
                        render={() => (
                          <FormItem className="space-y-6">
                            <div className="space-y-1">
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Amenities & Perks</FormLabel>
                              <FormDescription className="text-[10px] font-medium italic">
                                Select all that apply to highlight your property's value.
                              </FormDescription>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                              {amenitiesList.map((item) => (
                                <FormField
                                  key={item}
                                  control={form.control}
                                  name="amenities"
                                  render={({ field }) => {
                                    return (
                                      <FormItem
                                        key={item}
                                        className="flex flex-row items-center space-x-3 space-y-0 p-4 rounded-2xl border border-border/50 bg-background/50 hover:bg-primary/5 transition-colors cursor-pointer group"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(item)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...(field.value || []), item])
                                                : field.onChange(
                                                    field.value?.filter(
                                                      (value) => value !== item
                                                    )
                                                  )
                                            }}
                                            className="w-5 h-5 rounded-lg border-2 border-primary/20 data-[state=checked]:bg-primary"
                                          />
                                        </FormControl>
                                        <FormLabel className="text-xs font-bold text-muted-foreground group-data-[state=checked]:text-primary cursor-pointer">
                                          {item}
                                        </FormLabel>
                                      </FormItem>
                                    )
                                  }}
                                />
                              ))}
                            </div>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}

                  {/* Step 4: Pricing & Photos */}
                  {currentStep === 4 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-10"
                    >
                      <div className="space-y-1">
                        <h2 className="text-2xl font-black tracking-tight">Financials & Media</h2>
                        <p className="text-muted-foreground text-sm font-medium">Set your price and showcase your property with photos.</p>
                      </div>

                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Expected Price / Rent (₹)</FormLabel>
                            <FormControl>
                              <div className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-black transition-all group-focus-within:bg-primary group-focus-within:text-white">₹</div>
                                <Input 
                                  type="number" 
                                  className="h-20 rounded-3xl border-border/50 bg-background/50 pl-20 pr-8 text-3xl font-black tracking-tighter transition-all focus:ring-primary/20" 
                                  placeholder="0" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold" />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Property Showcase</FormLabel>
                          <span className="text-[10px] font-bold text-primary italic">Photos increase reach by 8x</span>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {imageUrls.map((url, index) => (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              key={index} 
                              className="relative group aspect-square rounded-[2rem] overflow-hidden border-2 border-border/50 shadow-inner"
                            >
                              <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="bg-destructive text-destructive-foreground p-3 rounded-2xl hover:scale-110 transition-transform shadow-xl"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              {index === 0 && (
                                <Badge className="absolute top-3 left-3 bg-primary text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg">Cover</Badge>
                              )}
                            </motion.div>
                          ))}
                          
                          {imageUrls.length < 10 && (
                            <label className="aspect-square rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer group">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={uploadingImages}
                              />
                              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6" />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Upload</span>
                            </label>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Form Footer Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-border/50">
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                      {currentStep > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={prevStep}
                          className="h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest border-border/50 hover:bg-secondary/50 transition-all w-full sm:w-auto"
                        >
                          Back
                        </Button>
                      )}
                      
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/properties')}
                        className="h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest text-muted-foreground hover:text-foreground transition-all w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                    </div>

                    {currentStep < 4 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="h-14 px-12 rounded-2xl font-black uppercase text-xs tracking-widest bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all w-full sm:w-auto interactive-hover"
                      >
                        Next Step
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isSubmitting || uploadingImages}
                        className="h-14 px-12 rounded-2xl font-black uppercase text-xs tracking-widest bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all w-full sm:w-auto interactive-hover"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Posting...
                          </>
                        ) : (
                          'Publish Property'
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-20 bg-card/50 backdrop-blur-xl border border-border/50 rounded-[3rem] shadow-xl p-10 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Crown className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-black tracking-tight mb-4">You've hit the limit</h2>
            <p className="text-muted-foreground max-w-sm mx-auto mb-10 font-medium">
              You've used all available property slots on your current plan. Upgrade to a higher tier to keep listing properties.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/plans')} className="h-14 rounded-2xl px-10 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20">
                Upgrade My Account
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/profile')} className="h-14 rounded-2xl px-10 font-black uppercase text-xs tracking-widest border-border/50">
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
