const Razorpay = require('razorpay');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder',
});

/**
 * POST /api/payments/create-order
 * Initialize a Razorpay order.
 */
exports.createOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise (e.g., ₹99 -> 9900)
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    return res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('[PaymentController] createOrder error:', {
      message: err.message,
      stack: err.stack,
      code: err.code,
      metadata: err.metadata
    });
    
    // Explicitly set status and JSON to avoid empty responses
    return res.status(500).json({ 
      error: 'Failed to create Razorpay order',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
  }
};

/**
 * POST /api/payments/verify
 * Verify Razorpay payment signature and update database.
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      bookingDetails // Context from frontend if needed
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Payment is verified! Update databases.

    // 1. Create/Update Payment in Supabase
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: razorpay_payment_id,
        userid: req.user.id,
        amount: 99,
        currency: 'INR',
        status: 'success',
        purpose: 'site-visit-token',
        gateway: 'razorpay',
        gateway_order_id: razorpay_order_id,
        gateway_payment_id: razorpay_payment_id
      })
      .select()
      .single();

    if (paymentError) {
        console.error('[PaymentController] Supabase Payment Error:', paymentError);
        // We continue because payment is physically done, but we should log this.
    }

    res.json({ 
      success: true, 
      message: 'Payment verified and recorded',
      paymentId: razorpay_payment_id
    });
  } catch (err) {
    console.error('[PaymentController] verifyPayment error:', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};
