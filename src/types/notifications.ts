export type NotificationChannel = 'push' | 'email' | 'sms' | 'in-app';

export interface NotificationPreference {
  id: string;
  userId: string;
  channel: NotificationChannel;
  enabled: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type:
    | 'new-match'
    | 'price-drop'
    | 'response'
    | 'rent-due'
    | 'agreement-expiry'
    | 'booking-site-visit'
    | 'token-payment-received'
    | 'token-refunded'
    | 'system';
  metadata?: {
    bookingId?: string;
    paymentId?: string;
    propertyId?: string;
    amount?: number;
    transactionReference?: string;
  };
  createdAt: string;
  readAt?: string;
}
