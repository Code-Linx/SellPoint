/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const verifyStripeSignature = (req, secret) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, secret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  return event;
};

exports.stripeWebhookHandler = async (req, res, next) => {
  try {
    const event = verifyStripeSignature(req, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;

      // Handle successful payment here
      console.log(`Payment succeeded: ${paymentIntent.id}`);
      // You can place the order in your system now
    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).send({ received: true });
  } catch (error) {
    console.error(`Webhook error: ${error.message}`);
    res.status(400).send({ error: 'Webhook error' });
  }
};


exports.createPaymentIntent = async (req, res, next) => {
  try {
    const { amount, currency } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Amount in cents (e.g., $10 = 1000)
      currency, // e.g., 'usd'
      description: 'SellPoint Order Payment',
      metadata: { integration_check: 'accept_a_payment' },
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    next(error);
  }
};
