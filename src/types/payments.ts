export type PaymentMethod = 'upi' | 'card' | 'net-banking' | 'wallet';

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  userId: string;
  ownerId?: string;
  amount: number;
  currency: 'INR';
  method: PaymentMethod;
  status: PaymentStatus;
  purpose: 'rent' | 'deposit' | 'service' | 'maintenance' | 'subscription';
  referenceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentScheduleItem {
  id: string;
  propertyId: string;
  tenantId: string;
  ownerId: string;
  dueDate: string;
  amount: number;
  status: 'upcoming' | 'due' | 'paid' | 'overdue';
  paymentId?: string;
}

export interface Invoice {
  id: string;
  userId: string;
  description: string;
  amount: number;
  gstAmount: number;
  createdAt: string;
  pdfUrl?: string;
}
