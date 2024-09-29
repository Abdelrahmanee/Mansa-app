import { authenticate, authorize } from "../../auth/middelwares/auth.middelware.js";
import { Router } from "express";
import { validate } from "../../../middelwares/validation.middelware.js";
import { uploadMultiple, uploadSingle } from "../../../middelwares/upload.middelware.js";
import { addLectureSchema, checkingAccess, deleteLectureSchema, generateAccessCode, getLectureByIdSchema, lectureAccessRequest } from "../validations/lecture.validation.js";
import { addLecture, checkStudentAccess, deleteLecture, generateLectureCode, getAllLectures, getLectureById, grantStudentAccess } from "../controllers/lecture.controller.js";
import { isLectureExists } from "../middlewares/lecture.middleware.js";
import { ROLES } from "../../../utilies/enums.js";


const router = Router()





router.get('/', authenticate, authorize('teacher', 'student'), getAllLectures)

router.post('/add_lecture',
    authenticate,
    authorize(ROLES.TEACHER , ROLES.ADMIN),
    // uploadSingle('logo'),
    uploadMultiple([{ name: 'logo', maxCount: 1 }, { name: 'videos', maxCount: 10 }, { name: 'pdfs', maxCount: 10 }]),
    validate(addLectureSchema),
    addLecture
)
router.post('/delete_lecture',
    authenticate,
    authorize(ROLES.TEACHER , ROLES.ADMIN),
    validate(deleteLectureSchema),
    deleteLecture
)

router.post('/generate_Access_code',
    authenticate,
    authorize(ROLES.TEACHER , ROLES.ADMIN),
    validate(generateAccessCode),
    isLectureExists,
    generateLectureCode
)


router.post('/lecture_access_request',
    authenticate,
    authorize(ROLES.TEACHER , ROLES.ADMIN, ROLES.STUDENT),
    validate(lectureAccessRequest),
    isLectureExists,
    grantStudentAccess
)

router.post('/check_student_access',
    authenticate,
    authorize(ROLES.TEACHER , ROLES.ADMIN, ROLES.STUDENT),
    validate(checkingAccess),
    isLectureExists,
    checkStudentAccess
)
router.get('/getLectureByID/:lectureId', authenticate, validate(getLectureByIdSchema), getLectureById)



export default router

