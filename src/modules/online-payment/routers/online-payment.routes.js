import { Router } from "express";
import PaymentController from "../controllers/online-payment.controller.js";
import StripePaymentService from '../services/online-payment.service.js'
import { authenticate } from "../../auth/middelwares/auth.middelware.js";



const router = Router()
const stripeService = new StripePaymentService(process.env.STRIPE_API_KEY);
const paymentController = new PaymentController(stripeService);

router.post('/online-payment',authenticate ,  paymentController.createPayment.bind(paymentController));

export default router