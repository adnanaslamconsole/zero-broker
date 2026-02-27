export type PlanKind =
  | 'basic'
  | 'premium-owner'
  | 'tenant-contact'
  | 'pay-per-lead'
  | 'featured-listing'
  | 'service-commission'
  | 'society-saas';

export interface PlanFeature {
  id: string;
  label: string;
  limit?: number;
}

export interface PricingPlan {
  id: string;
  kind: PlanKind;
  name: string;
  price: number;
  durationInDays?: number;
  features: PlanFeature[];
  isRecommended: boolean;
}

