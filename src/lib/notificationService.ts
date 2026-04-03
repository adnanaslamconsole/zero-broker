import { supabase } from './supabase';
import { toast } from 'sonner';
import { appFetch } from './requestAbort';
import type { NotificationItem, NotificationChannel } from '@/types/notifications';

export const notificationService = {
  /**
   * Send a notification to a user via all enabled channels
   */
  async sendNotification(params: {
    userId: string;
    title: string;
    message: string;
    type: NotificationItem['type'];
    metadata?: NotificationItem['metadata'];
    channels?: NotificationChannel[];
  }) {
    const { userId, title, message, type, metadata, channels = ['in-app', 'email', 'sms'] } = params;

    // 1. Send in-app notification
    if (channels.includes('in-app')) {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message,
        type,
        metadata,
        created_at: new Date().toISOString(),
      });
      if (error) console.error('Error sending in-app notification:', error);
    }

    // 2. Simulate email/SMS (mocked for this implementation)
    if (channels.includes('email')) {
      console.log(`[Email Sent to ${userId}]: ${title} - ${message}`);
      // In a real app, this would call an email API like SendGrid or AWS SES
    }

    if (channels.includes('sms')) {
      console.log(`[SMS Sent to ${userId}]: ${title} - ${message}`);
      // In a real app, this would call an SMS API like Twilio or MessageBird
    }

    // 3. Show a toast if it's the current user receiving it
    // In a real app, you'd use a real-time subscription for this
    // For now, we'll manually toast if we're sending to the current user (if known)
    // (This part is tricky without a global user context here, so we'll omit)
  },

  /**
   * Specifically send site visit booking notifications
   */
  async notifyBookingConfirmed(params: {
    bookingId: string;
    ownerId: string;
    tenantId: string;
    propertyId: string;
    propertyTitle: string;
    amount: number;
    visitDate: string;
    visitTime: string;
    transactionRef: string;
  }) {
    const { bookingId, ownerId, tenantId, propertyId, propertyTitle, amount, visitDate, visitTime, transactionRef } = params;

    // Notify Owner
    await this.sendNotification({
      userId: ownerId,
      title: 'New Site Visit Booked!',
      message: `A site visit for "${propertyTitle}" has been booked on ${visitDate} at ${visitTime}. Token payment of ₹${amount} received.`,
      type: 'token-payment-received',
      metadata: { bookingId, amount, transactionReference: transactionRef },
    });

    // Notify Tenant
    await this.sendNotification({
      userId: tenantId,
      title: 'Booking Confirmed!',
      message: `Your site visit for "${propertyTitle}" on ${visitDate} at ${visitTime} is confirmed. Token payment of ₹${amount} received. Ref: ${transactionRef}`,
      type: 'booking-site-visit',
      metadata: { bookingId, amount, transactionReference: transactionRef },
    });

    // Trigger Backend Real Notifications (Email/SMS)
    try {
      await appFetch('/api/notifications/notify-booking', {
        method: 'POST',
        body: JSON.stringify({
          tenantId,
          ownerId,
          propertyId,
          bookingId,
          visitDate,
          visitTime
        })
      });
    } catch (err) {
      console.error('[NotificationService] Backend notification failed:', err);
    }

    toast.success('Confirmations sent to both parties');
  }
};
