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
  body: string;
  type:
    | 'new-match'
    | 'price-drop'
    | 'response'
    | 'rent-due'
    | 'agreement-expiry'
    | 'system';
  createdAt: string;
  readAt?: string;
}
