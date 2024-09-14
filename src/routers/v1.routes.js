import { Router } from "express"
import authRouter from '../modules/auth/routers/auth.routes.js'
import userRouter from '../modules/user/routers/user.routes.js'
import  lectureRouter  from "../modules/lecture/routers/lecture.routes.js"
import onlinePaymentRouter from "../modules/online-payment/routers/online-payment.routes.js"
const router = Router()

router.use('/auth', authRouter)
router.use('/users', userRouter)
router.use('/lectures', lectureRouter)
router.use('/payment',onlinePaymentRouter )


export default router