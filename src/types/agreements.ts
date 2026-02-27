export type AgreementStatus = 'draft' | 'pending-signature' | 'active' | 'expired' | 'cancelled';

export interface AgreementTemplate {
  id: string;
  state: string;
  stampDutyPercentage: number;
  baseClauses: string[];
}

export interface RentalAgreementParty {
  name: string;
  address: string;
  idNumberMasked?: string;
}

export interface RentalAgreement {
  id: string;
  propertyId: string;
  owner: RentalAgreementParty;
  tenant: RentalAgreementParty;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  customClauses: string[];
  state: string;
  status: AgreementStatus;
  generatedAt: string;
  signedAt?: string;
  pdfUrl?: string;
}
