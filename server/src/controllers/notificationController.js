const notificationService = require('../services/notificationService');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Trigger a booking notification
 * POST /api/notifications/notify-booking
 */
exports.notifyBooking = async (req, res) => {
  try {
    const { tenantId, ownerId, propertyId, bookingId, visitDate, visitTime } = req.body;

    if (!tenantId || !ownerId || !propertyId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch details for tenant, owner and property
    const [tenantRes, ownerRes, propertyRes] = await Promise.all([
      supabase.from('profiles').select('email, mobile, name').eq('id', tenantId).single(),
      supabase.from('profiles').select('email, mobile, name').eq('id', ownerId).single(),
      supabase.from('properties').select('title').eq('id', propertyId).single()
    ]);

    if (!tenantRes.data || !ownerRes.data || !propertyRes.data) {
      return res.status(404).json({ error: 'Tenant, Owner or Property not found' });
    }

    const booking = { visit_date: visitDate, visit_time: visitTime };
    
    await notificationService.notifyBooking(
      tenantRes.data,
      ownerRes.data,
      propertyRes.data,
      booking
    );

    res.json({ message: 'Booking notifications sent successfully' });
  } catch (err) {
    console.error('[NotificationController] notifyBooking error:', err);
    res.status(500).json({ error: 'Failed to send booking notifications' });
  }
};
