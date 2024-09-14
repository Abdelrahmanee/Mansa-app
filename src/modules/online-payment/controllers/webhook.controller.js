

export class WebhookController {
    constructor(stripePaymentService) {
      this.stripePaymentService = stripePaymentService;
    }
  
    handleWebhook(request, response) {
      const sig = request.headers['stripe-signature'];
      let event;
  
      try {
        event = stripe.webhooks.constructEvent(
          request.body,
          sig,
          process.env.WEBHOOK_SECRET
        );
      } catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }
  
      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          this.stripePaymentService.handleWebhookEvent(event);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
  
      response.json({ received: true });
    }
  }
  
  