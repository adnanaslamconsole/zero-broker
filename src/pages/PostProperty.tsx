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
import { useQuery } from '@tanstack/react-query';

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
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { LocationSearch } from '@/components/property/LocationSearch';

// Form Schema
const propertySchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  type: z.enum(['rent', 'sale', 'pg', 'commercial']),
  property_category: z.string().min(1, 'Property category is required'),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Price must be a positive number'),
  city: z.string().min(1, 'City is required'),
  locality: z.string().min(1, 'Locality is required'),
  address: z.string().min(5, 'Address is required'),
  bedrooms: z.string().transform((val) => Number(val)).optional(),
  bathrooms: z.string().transform((val) => Number(val)).optional(),
  area: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Area must be a positive number'),
  furnishing_status: z.enum(['furnished', 'semi-furnished', 'unfurnished']),
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
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null);

  // Fetch subscription & limits
  const { data: subscriptionInfo, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription-limits', user?.profile.id],
    queryFn: async () => {
      if (!user || user.profile.id === '00000000-0000-0000-0000-000000000000') {
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
    enabled: !!user && user.profile.id !== '00000000-0000-0000-0000-000000000000',
  });

  const maxListings = subscriptionInfo?.plan?.max_listings || 0;
  const usedListings = subscriptionInfo?.used || 0;
  const isLimitReached = !!user && maxListings > 0 && usedListings >= maxListings;
  const hasNoPlan = !!user && !isLoadingSubscription && !subscriptionInfo?.plan;

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setUploadedImages(prev => [...prev, ...fileArray]);

      // Create preview URLs
      const newUrls = fileArray.map(file => URL.createObjectURL(file));
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
    if (user?.profile.id === '00000000-0000-0000-0000-000000000000') {
      return imageUrls; // Return local preview URLs for demo
    }

    const urls: string[] = [];
    setUploadingImages(true);

    try {
      for (const file of uploadedImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user?.profile.id}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('property-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('property-images')
          .getPublicUrl(data.path);

        urls.push(publicUrlData.publicUrl);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingImages(false);
    }

    return urls;
  };

  const onSubmit = async (data: PropertyFormValues) => {
    if (!user) {
      toast.error('You must be logged in to post a property');
      navigate('/login');
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadedUrls = await uploadImagesToStorage();

      // Handle demo user submission
      if (user.profile.id === '00000000-0000-0000-0000-000000000000') {
        await new Promise(resolve => setTimeout(resolve, 1500));
        toast.success('Demo Property posted successfully!');
        navigate('/properties');
        return;
      }

      const { error } = await supabase.from('properties').insert({
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
        area: Number(data.area),
        furnishing_status: data.furnishing_status,
        amenities: data.amenities || [],
        images: uploadedUrls,
        verification_status: 'pending',
        is_available: true,
        is_verified: false,
        latitude: selectedLocation?.lat,
        longitude: selectedLocation?.lon,
      });

      if (error) throw error;

      toast.success('Property posted successfully!');
      navigate('/properties');
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to post property');
    } finally {
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
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  return (
    <div className="min-h-screen bg-secondary/30 pb-20 pt-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Post Your Property</h1>
          <p className="text-muted-foreground mt-2">List your property for free and connect with genuine tenants/buyers.</p>
        </div>

        {/* Subscription Limits Alert */}
        {!!user && !isLoadingSubscription && (
          <div className="mb-8">
            {hasNoPlan ? (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Active Plan</AlertTitle>
                <AlertDescription className="flex items-center justify-between mt-2">
                  <span>You need an active plan to post properties.</span>
                  <Button variant="destructive" size="sm" onClick={() => navigate('/plans')}>
                    View Plans
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">
                      Current Plan: {subscriptionInfo?.plan?.name}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {usedListings} / {maxListings} listings used
                  </span>
                </div>
                <Progress value={(usedListings / maxListings) * 100} className="h-2 mb-2" />
                {isLimitReached ? (
                  <div className="flex items-center justify-between text-sm text-destructive mt-2 bg-destructive/5 p-2 rounded">
                    <span className="flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4" />
                      Limit Reached
                    </span>
                    <Link to="/plans" className="underline hover:text-destructive/80">
                      Upgrade to post more
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    You can post {maxListings - usedListings} more properties.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Steps Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border -z-10" />
            {steps.map((step) => (
              <div 
                key={step.id}
                className={`flex flex-col items-center gap-2 bg-background px-4 ${
                  step.id <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    step.id < currentStep 
                      ? 'bg-primary border-primary text-primary-foreground'
                      : step.id === currentStep
                      ? 'border-primary text-primary bg-background'
                      : 'border-muted text-muted-foreground bg-background'
                  }`}
                >
                  {step.id < currentStep ? <CheckCircle2 className="w-6 h-6" /> : <step.icon className="w-5 h-5" />}
                </div>
                <span className="text-sm font-medium hidden sm:block">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>I want to</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="rent">Rent Out</SelectItem>
                                <SelectItem value="sale">Sell</SelectItem>
                                <SelectItem value="pg">List as PG</SelectItem>
                                <SelectItem value="commercial">List Commercial</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="property_category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="apartment">Apartment</SelectItem>
                                <SelectItem value="villa">Villa / House</SelectItem>
                                <SelectItem value="plot">Plot / Land</SelectItem>
                                <SelectItem value="office">Office Space</SelectItem>
                                <SelectItem value="shop">Shop / Showroom</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 2 BHK Apartment in Koramangala" {...field} />
                          </FormControl>
                          <FormDescription>
                            A catchy title attracts more views.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your property (amenities, nearby landmarks, etc.)" 
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {/* Step 2: Location */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <LocationSearch 
                                value={field.value} 
                                onChange={field.onChange}
                                onLocationSelect={(loc) => {
                                  setSelectedLocation({ lat: loc.lat, lon: loc.lon });
                                  // Optionally auto-fill locality if available in loc.name
                                }}
                              />
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
                            <FormLabel>Locality / Area</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. HSR Layout" {...field} />
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
                            <Textarea placeholder="Enter full address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {/* Step 3: Details */}
                {currentStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="bedrooms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bedrooms (BHK)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bathrooms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bathrooms</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="area"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Carpet Area (sq.ft)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1200" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="furnishing_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Furnishing Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="furnished">Fully Furnished</SelectItem>
                              <SelectItem value="semi-furnished">Semi Furnished</SelectItem>
                              <SelectItem value="unfurnished">Unfurnished</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amenities"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Amenities</FormLabel>
                            <FormDescription>
                              Select the amenities available at your property.
                            </FormDescription>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {amenitiesList.map((item) => (
                              <FormField
                                key={item}
                                control={form.control}
                                name="amenities"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={item}
                                      className="flex flex-row items-start space-x-3 space-y-0"
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
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {item}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {/* Step 4: Pricing & Photos */}
                {currentStep === 4 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Price / Rent (₹)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input type="number" className="pl-9" placeholder="25000" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <FormLabel>Property Photos</FormLabel>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {imageUrls.map((url, index) => (
                          <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                            <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        
                        <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <span className="text-xs text-muted-foreground">Upload Photo</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            className="hidden" 
                            onChange={handleImageUpload}
                          />
                        </label>
                      </div>
                      <FormDescription>
                        Upload at least 1 photo. Max 10 photos allowed.
                      </FormDescription>
                    </div>
                  </motion.div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1 || isSubmitting}
                  >
                    Previous
                  </Button>
                  
                  {currentStep < 4 ? (
                    <Button type="button" onClick={nextStep}>
                      Next Step
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting || uploadingImages || isLimitReached || hasNoPlan}>
                      {(isSubmitting || uploadingImages) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Post Property
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
