import { Router } from 'express';
import Stripe from 'stripe';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Create payment intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'eur', paymentMethodId } = req.body;

    if (!amount || !paymentMethodId) {
      return res.status(400).json({ 
        error: 'Amount and payment method ID are required' 
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents
      currency,
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      return_url: `${process.env.APP_URL || 'http://localhost:3000'}/mobile/payment-success`,
      metadata: {
        source: 'mobile_app'
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status
    });

  } catch (error: any) {
    console.error('Stripe payment intent error:', error);
    res.status(400).json({ 
      error: error.message || 'Error creating payment intent' 
    });
  }
});

// Webhook endpoint for Stripe events
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(400).send('Webhook secret not configured');
  }

  let event;

  try {
    // req.body is already a Buffer due to express.raw() middleware
    event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    console.log('Webhook event received:', event.type);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      // Handle successful payment
      break;
    
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      // Handle failed payment
      break;
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

export default router;
