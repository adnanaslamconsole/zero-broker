const { sendSMS } = require('./smsService');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Centralized service for sending notifications via multiple channels.
 */
const notificationService = {
  /**
   * Generic Email sender via Supabase Edge Function proxy
   */
  async sendEmail(to, subject, text) {
    try {
      console.log(`[NotificationService] Sending Email to ${to}: ${subject}`);
      
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { to, subject, text }
      });

      if (error) {
        console.error('[NotificationService] Supabase Email Error:', error);
        // Fallback to console log in dev
        return false;
      }
      return true;
    } catch (err) {
      console.error('[NotificationService] Email Exception:', err);
      return false;
    }
  },

  /**
   * Generic SMS sender via Twilio
   */
  async sendSMS(to, message) {
    try {
      console.log(`[NotificationService] Sending SMS to ${to}`);
      await sendSMS(to, message);
      return true;
    } catch (err) {
      console.error('[NotificationService] SMS Error:', err);
      return false;
    }
  },

  /**
   * Notify user about KYC Status Change
   */
  async notifyKycStatus(user, status, reason) {
    const subject = `KYC Verification ${status.toUpperCase()}`;
    const text = status === 'verified' 
      ? `Congratulations! Your identity has been verified on Zero Broker. You can now post properties and book unlimited visits.`
      : `Your KYC verification was ${status}. Reason: ${reason || 'Please re-upload clear documents.'}`;

    // Send Email
    if (user.email) {
      await this.sendEmail(user.email, subject, text);
    }

    // Send SMS
    if (user.mobile) {
      await this.sendSMS(user.mobile, text);
    }
  },

  /**
   * Notify about Property Moderation
   */
  async notifyPropertyModeration(user, property, status) {
    const subject = `Property Listing ${status.toUpperCase()}`;
    const text = status === 'verified'
      ? `Success! Your property "${property.title}" is now live on our platform.`
      : `Your property listing "${property.title}" needs updates before it can be listed.`;

    if (user.email) await this.sendEmail(user.email, subject, text);
    if (user.mobile) await this.sendSMS(user.mobile, text);
  },

  /**
   * Notify about New Booking
   */
  async notifyBooking(tenant, owner, property, booking) {
    // Notify Tenant
    const tenantText = `Booking Confirmed! Your visit for "${property.title}" is scheduled for ${booking.visit_date} at ${booking.visit_time}.`;
    if (tenant.email) await this.sendEmail(tenant.email, 'Visit Booking Confirmed', tenantText);
    if (tenant.mobile) await this.sendSMS(tenant.mobile, tenantText);

    // Notify Owner
    const ownerText = `New Visit Request! A tenant has booked a visit for your property "${property.title}" on ${booking.visit_date} at ${booking.visit_time}.`;
    if (owner.email) await this.sendEmail(owner.email, 'New Site Visit Booked', ownerText);
    if (owner.mobile) await this.sendSMS(owner.mobile, ownerText);
  }
};

module.exports = notificationService;
