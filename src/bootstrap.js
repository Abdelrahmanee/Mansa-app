
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
import dotenv from 'dotenv'

dotenv.config()
export const bootstrap = (app) => {


    const stripePaymentService = new StripePaymentService();
              
    // Initialize the controller with dependency injection
    const webhookController = new WebhookController(stripePaymentService);

    // Define the webhook route
    app.post('/webhook', express.raw({ type: "application/json" }), (req, res) => {
        webhookController.handleWebhook(req, res);
    });


    cloudinaryCofigration();

    app.use(express.json())


    app.use(cors());


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