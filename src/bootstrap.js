
import express from 'express'

import cors from 'cors'
import morgan from 'morgan'
import v1Router from './routers/v1.routes.js'
import { AppError, catchAsyncError } from './utilies/error.js'
import { cron } from './utilies/cron.js'
import { cloudinaryCofigration } from './utilies/cloudinary.js'
import cookieParser from 'cookie-parser'
import StripePaymentService from './modules/online-payment/services/online-payment.service.js'
import { WebhookController } from './modules/online-payment/controllers/webhook.controller.js'
import { makeOnlineOrder } from './modules/online-payment/controllers/online-payment.controller.js'
import Stripe from 'stripe'
import dotenv from 'dotenv'

dotenv.config()
export const bootstrap = (app) => {

    // const stripePaymentService = new StripePaymentService();

    // // Initialize the controller with dependency injection
    // const webhookController = new WebhookController(stripePaymentService);

    // // Define the webhook route
    // app.post('/webhook', (req, res) => {
    //     console.log("Webhook");

    //   webhookController.handleWebhook(req, res);
    // });

    app.post("/webhook", express.raw({ type: "application/json" }),

        catchAsyncError(async (request, response) => {
            console.log(process.env.WEB_HOOK_SECRET);

            const sig = request.headers["stripe-signature"];

            let event;

            try {
                event = Stripe.webhooks.constructEvent(
                    request.body,
                    sig,
                    process.env.WEB_HOOK_SECRET
                );
            } catch (err) {
                response.status(400).send(`Webhook Error: ${err.message}`);
                return;
            }

            // Handle the event
            switch (event.type) {
                case "checkout.session.completed":
                    const data = event.data.object;
                    console.log("data", { data });

                    await makeOnlineOrder(data);
                    break;
                default:
                    console.log(`Unhandled event type ${event.type}`);
            }

            // Return a 200 response to acknowledge receipt of the event
            response.send();
        })
    );



    cloudinaryCofigration();

    app.use(cookieParser())
    app.use(express.json())
    // Allow all origins
    const corsOptions = {
        origin: (origin, callback) => {
            callback(null, true); // Allow any origin dynamically
        },
        credentials: true, // Allow credentials (cookies)
        allowedHeaders: ['Content-Type', 'Authorization'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
    };


    app.use(cors(corsOptions));


    app.use(morgan('dev'))

    // cron();

    app.use('/api/v1', v1Router)


    app.all('*', (req, res, next) => {
        throw new AppError('Route not found', 404)
    })


    app.use((err, req, res, next) => {
        err.statusCode = err.statusCode || 500;
        err.status = err.status || 'error';
        err.stack = err.stack;

        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            ...(process.env.MODE === 'devlopment' && { stack: err.stack })
        });
    });

}