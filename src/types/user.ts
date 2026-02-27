export type UserRole =
  | 'owner'
  | 'tenant'
  | 'buyer'
  | 'seller'
  | 'service-partner'
  | 'society-admin'
  | 'platform-admin';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface KycDocument {
  id: string;
  type: 'aadhaar' | 'pan' | 'passport' | 'driver-license' | 'other';
  numberMasked: string;
  status: VerificationStatus;
  uploadedAt: string;
  verifiedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  mobile: string;
  avatarUrl?: string;
  roles: UserRole[];
  primaryRole: UserRole;
  kycStatus: VerificationStatus;
  kycDocuments: KycDocument[];
  trustScore: number;
  isBlocked: boolean;
  isPaid?: boolean;
  isDemo?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  createdAt: string;
  lastRunAt?: string;
  alertEnabled: boolean;
}

export interface ActivityEvent {
  id: string;
  type:
    | 'listing-created'
    | 'listing-updated'
    | 'listing-paused'
    | 'lead-contacted'
    | 'lead-replied'
    | 'service-booked'
    | 'payment-success'
    | 'payment-failed'
    | 'agreement-generated'
    | 'login'
    | 'logout';
  createdAt: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface UserAccountSnapshot {
  profile: UserProfile;
  savedSearches: SavedSearch[];
  favorites: string[];
  recentActivity: ActivityEvent[];
}
