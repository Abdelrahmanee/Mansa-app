import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();


const stripe = new Stripe(process.env.STRIPE_API_KEY);  // Initialize Stripe with your secret key

export class WebhookController {
  constructor(stripePaymentService) {
    this.stripePaymentService = stripePaymentService;
  }

  handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // Use the raw body (req.body as Buffer) for signature verification
      event = stripe.webhooks.constructEvent(
        req.body,  // raw body
        sig,
        process.env.WEBHOOK_SECRET  // Your webhook secret
      );
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        console.log(event.type);
        this.stripePaymentService.handleWebhookEvent(event);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  }
}
