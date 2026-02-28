import { sampleProperties } from '@/data/sampleProperties';
import type { Property } from '@/types/property';
import type { UserAccountSnapshot, UserProfile, SavedSearch } from '@/types/user';
import type { ServiceDefinition, ServiceId, ServiceBooking } from '@/types/services';
import type { Society, MaintenanceInvoice, ComplaintTicket } from '@/types/society';
import type { Payment, RentScheduleItem } from '@/types/payments';
import type { RentalAgreement } from '@/types/agreements';
import type { NotificationItem } from '@/types/notifications';
import type { PricingPlan } from '@/types/plans';

let properties: Property[] = [...sampleProperties];

const mockUser: UserProfile = {
  id: 'user1',
  name: 'Demo Owner',
  email: 'owner@example.com',
  mobile: '+91-9999999999',
  avatarUrl: undefined,
  roles: ['owner', 'tenant'],
  primaryRole: 'owner',
  kycStatus: 'verified',
  kycDocuments: [],
  trustScore: 92,
  isBlocked: false,
  lastLoginAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

let currentUser: UserAccountSnapshot | null = {
  profile: mockUser,
  savedSearches: [],
  favorites: [],
  recentActivity: [],
};

const services: ServiceDefinition[] = [
  {
    id: 'packers-movers',
    name: 'Packers & Movers',
    category: 'moving',
    description: 'End-to-end relocation with verified partners',
    basePrice: 3000,
    rating: 4.8,
    reviewCount: 12000,
    isPopular: true,
  },
  {
    id: 'cleaning',
    name: 'Home Cleaning',
    category: 'cleaning',
    description: 'Deep cleaning for 1/2/3 BHK homes',
    basePrice: 1500,
    rating: 4.9,
    reviewCount: 15000,
    isPopular: true,
  },
  {
    id: 'painting',
    name: 'Painting',
    category: 'painting',
    description: 'Interior and exterior painting packages',
    basePrice: 5000,
    rating: 4.7,
    reviewCount: 8000,
    isPopular: true,
  },
  {
    id: 'pest-control',
    name: 'Pest Control',
    category: 'pest-control',
    description: 'Odourless pest control for homes',
    basePrice: 1200,
    rating: 4.6,
    reviewCount: 6000,
    isPopular: false,
  },
  {
    id: 'repairs',
    name: 'Home Repairs',
    category: 'repairs',
    description: 'Plumbing, electrical and carpentry on demand',
    basePrice: 500,
    rating: 4.5,
    reviewCount: 4000,
    isPopular: false,
  },
  {
    id: 'furniture',
    name: 'Furniture Rental',
    category: 'furniture-rental',
    description: 'Rent curated furniture sets',
    basePrice: 999,
    rating: 4.5,
    reviewCount: 3000,
    isPopular: true,
  },
  {
    id: 'rental-agreement',
    name: 'Rental Agreement',
    category: 'legal',
    description: 'Digitally signed, stamp duty compliant agreements',
    basePrice: 999,
    rating: 4.8,
    reviewCount: 20000,
    isPopular: true,
  },
];

const societies: Society[] = [
  {
    id: 'soc1',
    name: 'Palm Heights Society',
    city: 'Bangalore',
    locality: 'Whitefield',
    address: 'Palm Heights, Whitefield, Bangalore',
    totalFlats: 124,
    isActive: true,
  },
];

const societyInvoices: MaintenanceInvoice[] = [
  {
    id: 'inv1',
    societyId: 'soc1',
    flatId: 'flat1',
    month: '2026-01',
    amount: 5200,
    dueDate: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    status: 'paid',
  },
];

const complaints: ComplaintTicket[] = [
  {
    id: 'comp1',
    societyId: 'soc1',
    flatId: 'flat1',
    title: 'Lift not working',
    description: 'Lift in Tower A is not working since morning',
    category: 'maintenance',
    status: 'in-progress',
    createdBy: 'user1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const pricingPlans: PricingPlan[] = [
  {
    id: 'plan-basic',
    kind: 'basic',
    name: 'Basic',
    price: 0,
    features: [
      { id: 'listings-1', label: 'Post up to 1 active listing' },
      { id: 'leads-limited', label: 'Limited tenant contacts' },
    ],
    isRecommended: false,
  },
  {
    id: 'plan-premium-owner',
    kind: 'premium-owner',
    name: 'Premium Owner',
    price: 999,
    durationInDays: 60,
    features: [
      { id: 'listings-unlimited', label: 'Unlimited active listings' },
      { id: 'featured', label: 'Featured placement on search' },
      { id: 'contact-unlimited', label: 'Unlimited tenant contacts' },
    ],
    isRecommended: true,
  },
  {
    id: 'plan-society',
    kind: 'society-saas',
    name: 'Society Management',
    price: 1999,
    durationInDays: 30,
    features: [
      { id: 'visitors', label: 'Visitor management' },
      { id: 'maintenance', label: 'Maintenance billing and reminders' },
      { id: 'accounting', label: 'Basic accounting reports' },
    ],
    isRecommended: false,
  },
];

let bookings: ServiceBooking[] = [];
// eslint-disable-next-line prefer-const
let payments: Payment[] = [];
// eslint-disable-next-line prefer-const
let rentSchedule: RentScheduleItem[] = [];
// eslint-disable-next-line prefer-const
let agreements: RentalAgreement[] = [];
// eslint-disable-next-line prefer-const
let notifications: NotificationItem[] = [];
let savedSearchCounter = 0;

export function getCurrentUser(): Promise<UserAccountSnapshot | null> {
  return Promise.resolve(currentUser);
}

export function loginWithOtp(mobile: string): Promise<UserAccountSnapshot> {
  currentUser =
    currentUser ??
    {
      profile: { ...mockUser, mobile },
      savedSearches: [],
      favorites: [],
      recentActivity: [],
    };
  return Promise.resolve(currentUser);
}

export function logout(): Promise<void> {
  currentUser = null;
  return Promise.resolve();
}

export function saveSearch(name: string, query: string): Promise<SavedSearch> {
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  savedSearchCounter += 1;
  const saved: SavedSearch = {
    id: String(savedSearchCounter),
    name,
    query,
    createdAt: new Date().toISOString(),
    lastRunAt: new Date().toISOString(),
    alertEnabled: true,
  };
  currentUser = {
    ...currentUser,
    savedSearches: [saved, ...currentUser.savedSearches],
  };
  return Promise.resolve(saved);
}

export function listProperties(): Promise<Property[]> {
  return Promise.resolve(properties);
}

export function getPropertyById(id: string): Promise<Property | undefined> {
  return Promise.resolve(properties.find((p) => p.id === id));
}

export function createPropertyListing(input: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'leads'>): Promise<Property> {
  const now = new Date().toISOString();
  const property: Property = {
    ...input,
    id: String(properties.length + 1),
    createdAt: now,
    updatedAt: now,
    views: 0,
    leads: 0,
  };
  properties = [property, ...properties];
  return Promise.resolve(property);
}

export function updatePropertyListing(id: string, updates: Partial<Property>): Promise<Property> {
  let found: Property | undefined;
  properties = properties.map((p) => {
    if (p.id === id) {
      found = { ...p, ...updates, updatedAt: new Date().toISOString() };
      return found;
    }
    return p;
  });
  if (!found) {
    throw new Error('Property not found');
  }
  return Promise.resolve(found);
}

export function listServices(): Promise<ServiceDefinition[]> {
  return Promise.resolve(services);
}

export function getServiceById(id: ServiceId): Promise<ServiceDefinition | undefined> {
  return Promise.resolve(services.find((s) => s.id === id));
}

export function createServiceBooking(input: Omit<ServiceBooking, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<ServiceBooking> {
  const now = new Date().toISOString();
  const booking: ServiceBooking = {
    ...input,
    id: String(bookings.length + 1),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  bookings = [booking, ...bookings];
  return Promise.resolve(booking);
}

export function listSocieties(): Promise<Society[]> {
  return Promise.resolve(societies);
}

export function listMaintenanceInvoices(): Promise<MaintenanceInvoice[]> {
  return Promise.resolve(societyInvoices);
}

export function listComplaints(): Promise<ComplaintTicket[]> {
  return Promise.resolve(complaints);
}

export function listPricingPlans(): Promise<PricingPlan[]> {
  return Promise.resolve(pricingPlans);
}

export function listPayments(): Promise<Payment[]> {
  return Promise.resolve(payments);
}

export function listRentSchedule(): Promise<RentScheduleItem[]> {
  return Promise.resolve(rentSchedule);
}

export function listAgreements(): Promise<RentalAgreement[]> {
  return Promise.resolve(agreements);
}

export function listNotifications(): Promise<NotificationItem[]> {
  return Promise.resolve(notifications);
}
