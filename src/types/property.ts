// Property Types
export type PropertyType = 'apartment' | 'villa' | 'pg' | 'commercial' | 'plot' | 'independent-house' | 'office' | 'shop';
export type ListingType = 'rent' | 'sale' | 'pg' | 'commercial';
export type FurnishingType = 'furnished' | 'semi-furnished' | 'unfurnished';

export interface Property {
  id: string;
  title: string;
  description: string;
  listingType: ListingType;
  propertyType: PropertyType;
  
  // Location
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  
  // Property details
  bhk: number;
  bathrooms: number;
  balconies: number;
  furnishing: FurnishingType;
  floor: number;
  totalFloors: number;
  
  // Area
  carpetArea: number;
  builtUpArea: number;
  superBuiltUpArea: number;
  areaUnit: 'sqft' | 'sqm';
  
  // Pricing
  price: number;
  pricePerSqft: number;
  securityDeposit?: number;
  maintenanceCharges?: number;
  
  // Features
  parking: number;
  amenities: string[];
  
  // Media
  images: string[];
  videos?: string[];
  virtualTourUrl?: string;
  
  // Listing info
  availableFrom: string;
  tenantPreference?: ('family' | 'bachelor' | 'company' | 'any')[];
  postedBy: 'owner' | 'agent' | 'builder';
  ownerId: string;
  
  // Status
  isVerified: boolean;
  isPremium: boolean;
  isFeatured: boolean;
  isActive: boolean;
  ownerTrustScore?: number;
  ownerKycStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  
  // Bounty & Community Verification
  bountyVerificationStatus?: 'pending' | 'community_vouched' | 'audit_failed';
  bountyReward?: number;
  communityTrustScore?: number;
  
  // Analytics
  views: number;
  leads: number;
  
  // Distance (if available)
  distanceKm?: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface OwnerAvailability {
  id: string;
  owner_id: string;
  property_id: string;
  available_day: number; // 0-6
  start_time: string;
  end_time: string;
}

export interface VisitBooking {
  id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  visit_date: string;
  visit_time: string;
  payment_id?: string;
  booking_status: 'pending' | 'confirmed' | 'completed' | 'no_show_tenant' | 'no_show_owner' | 'cancelled';
  otp_code?: string;
  refund_status: 'none' | 'pending' | 'completed' | 'failed' | 'converted_to_credit';
  createdAt: string;
  updatedAt: string;
}

export interface PropertyFilters {
  listingType?: ListingType;
  propertyType?: PropertyType[];
  city?: string;
  locality?: string[];
  minPrice?: number;
  maxPrice?: number;
  bhk?: number[];
  furnishing?: FurnishingType[];
  postedBy?: ('owner' | 'agent' | 'builder')[];
  amenities?: string[];
  availableFrom?: string;
  tenantPreference?: string[];
}

export interface SearchParams {
  query?: string;
  filters: PropertyFilters;
  sortBy: 'relevance' | 'price-low' | 'price-high' | 'newest' | 'distance';
  page: number;
  limit: number;
}

// Sample amenities
export const AMENITIES = [
  'Power Backup',
  'Lift',
  'Security',
  'Park',
  'Swimming Pool',
  'Gym',
  'Clubhouse',
  'Children Play Area',
  'Gas Pipeline',
  'Water Storage',
  'Rain Water Harvesting',
  'Intercom',
  'Fire Safety',
  'Visitor Parking',
  'Maintenance Staff',
  'CCTV',
  'Gated Community',
  'Wifi',
  'Air Conditioning',
];
