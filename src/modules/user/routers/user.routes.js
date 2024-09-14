import { authenticate, authorize, checkAccountVerification, checkUniqueIdentifier, isEmailExist, isUserExist } from "../../auth/middelwares/auth.middelware.js";
import { anotherUserInfo, deleteAccount, sendOTP, getAllAccountsAssociated, resetPassword, updateAccount, updateAccountEmail, updatePassword, userInfo, kickUserOut, softDeleteUser, updateProfilePicture, userLoggedOut, blockUser, userBlockedList, removeFromBlockList, getMyLectures } from "../controllers/user.controller.js";

import { Router } from "express";
import { anotherUserInfoSchema, sendOTPSchema, recoveryEmailSchema, resetPasswordSchema, updateAccountEmailSchema, updateAccountSchema, updatePasswordSchema, kickUserOutSchema, updateProfilePictureSchema } from "../validation/user.validation.js";
import { validate } from "../../../middelwares/validation.middelware.js";
import { ROLES } from "../../../utilies/enums.js";
import { uploadSingle } from "../../../middelwares/upload.middelware.js";
import { validateFields } from "../../../middelwares/validateFields.js";
import { checkBlockStatus, checkUserOtp } from "../middelwares/user.middelware.js";


const router = Router()

// user cruds
router.put('/update_account',
    validate(updateAccountSchema),
    authenticate,
    authorize('student', 'teacher'),
    updateAccount
)
router.patch('/update_profilePicture',
    uploadSingle('profilePicture'),
    validate(updateProfilePictureSchema),
    authenticate,
    authorize(ROLES.STUDENT, ROLES.ADMIN),
    updateProfilePicture
)
router.patch('/update_email',
    validate(updateAccountEmailSchema),
    authenticate,
    authorize(ROLES.STUDENT, ROLES.ADMIN),
    updateAccountEmail
)
router.delete('/delete_account', authenticate, authorize(ROLES.STUDENT, ROLES.ADMIN), deleteAccount)

router.patch('/update_password',
    validate(updatePasswordSchema), authenticate, authorize(ROLES.STUDENT, ROLES.ADMIN), updatePassword)

router.get('/user_info', authenticate, authorize(ROLES.STUDENT, ROLES.ADMIN), userInfo)
router.get('/my_lectures', authenticate, authorize(ROLES.TEACHER, ROLES.STUDENT), getMyLectures)



// forget password apis
router.put('/send_otp',
    validate(sendOTPSchema), sendOTP)

router.put('/reset_password', validate(resetPasswordSchema), isUserExist, checkUserOtp, resetPassword)


router.get('/getAllAccountsAssociated',
    validate(recoveryEmailSchema), authenticate, authorize(ROLES.STUDENT, ROLES.ADMIN), getAllAccountsAssociated)


// معملتش الروتس بتاعتهم مش عارف محتاجهم ولا لا
router.delete('/soft_delete', authenticate, authorize(ROLES.STUDENT, ROLES.ADMIN), softDeleteUser)
router.delete('/logout', authenticate, authorize(ROLES.STUDENT, ROLES.ADMIN), userLoggedOut)



// under thinking (Admin Only has array of blocked Users and can remove user from block lsit)

// router.get('/user/blocked_list', authenticate, authorize(ROLES.STUDENT), userBlockedList)
// router.patch('/user/remove_from_block_list', authenticate, authorize(ROLES.STUDENT), removeFromBlockList)
// router.delete('/block_user/:id', authenticate, authorize(ROLES.STUDENT), blockUser)


// Admin only

router.get('/user/:id',
    validate(anotherUserInfoSchema),
    authenticate,
    authorize(ROLES.ADMIN),
    // checkBlockStatus,
    anotherUserInfo
)

router.delete('/kickUserOut/:id',
    validate(kickUserOutSchema), authenticate, authorize(ROLES.ADMIN), kickUserOut)


export default router

