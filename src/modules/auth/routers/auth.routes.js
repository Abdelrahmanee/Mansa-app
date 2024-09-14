import { Router } from "express";
import { confirm_email, login, signup } from "../controllers/auth.controller.js";
import { signinSchema, signupSchema } from "../validations/auth.validation.js";
import { validate } from "../../../middelwares/validation.middelware.js";
import { uploadSingle } from "../../../middelwares/upload.middelware.js";
import { checkAccountVerification } from "../middelwares/auth.middelware.js";


const router = Router()


router.post('/sign_up',
    uploadSingle('profilePicture', 'profilePictures'),
    validate(signupSchema),
    signup
)
router.post('/login', validate(signinSchema), checkAccountVerification, login)
router.get('/confirmEmail/:token', confirm_email)

export default router