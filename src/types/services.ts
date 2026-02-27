export type ServiceCategory =
  | 'moving'
  | 'cleaning'
  | 'painting'
  | 'pest-control'
  | 'repairs'
  | 'furniture-rental'
  | 'legal';

export type ServiceId =
  | 'packers-movers'
  | 'cleaning'
  | 'painting'
  | 'pest-control'
  | 'repairs'
  | 'furniture'
  | 'rental-agreement';

export interface ServiceDefinition {
  id: ServiceId;
  name: string;
  category: ServiceCategory;
  description: string;
  basePrice: number;
  rating: number;
  reviewCount: number;
  isPopular: boolean;
}

export type ServiceBookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

export interface ServicePartner {
  id: string;
  name: string;
  cities: string[];
  rating: number;
  completedJobs: number;
  isVerified: boolean;
}

export interface ServiceBooking {
  id: string;
  serviceId: ServiceId;
  userId: string;
  partnerId?: string;
  city: string;
  address: string;
  scheduledFor: string;
  status: ServiceBookingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
