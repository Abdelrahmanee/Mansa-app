import Joi from "joi";

export const addLectureSchema = Joi.object({
    body: {
        title: Joi.string()
            .min(3)
            .max(255)
            .required()
            .messages({
                'string.base': `Title should be a type of 'text'`,
                'string.empty': `Title cannot be an empty field`,
                'string.min': `Title should have a minimum length of {#limit}`,
                'string.max': `Title should have a maximum length of {#limit}`,
                'any.required': `Title is a required field`
            }),
        description: Joi.string()
            .min(5)
            .max(1024)
            .required()
            .messages({
                'string.base': `Description should be a type of 'text'`,
                'string.empty': `Description cannot be an empty field`,
                'string.min': `Description should have a minimum length of {#limit}`,
                'string.max': `Description should have a maximum length of {#limit}`,
                'any.required': `Description is a required field`
            }),
        price: Joi.number().required(),
        duration: Joi.number().required(),
        rating: Joi.number().max(5).required(),
    },
    params: {},
    query: {},
    file: Joi.object().optional(),  // Allow single file (e.g., logo)
    files: Joi.object({             // Define the structure of the 'files' field
        logo: Joi.array().items(Joi.object()).required(),
        pdfs: Joi.array().items(Joi.object()).required(),
        videos: Joi.array().items(Joi.object()).required(),
    }).optional(),
})


export const generateAccessCode = Joi.object({
    body: {
        lectureId: Joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': `Lecture ID must be a valid ObjectId`,
            })
    },
    params: {},
    query: {},

})
export const deleteLectureSchema = Joi.object({
    body: {},
    params: {
        lectureId: Joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': `Lecture ID must be a valid ObjectId`,
            })
    },
    query: {},

})



export const lectureAccessRequest = Joi.object({
    body: {
        lectureId: Joi.string()
            .regex(/^[A-Za-z0-9]{24}$/)
            .required()
            .messages({
                'string.pattern.base': `Lecture ID must be a valid ObjectId`,
            }),
        code: Joi.string()
            .regex(/^[A-Za-z0-9]{12}$/)
            .required()
            .messages({
                'string.pattern.base': `"Invalid code", code must be exactly 12 characters long, containing only lowercase letters (a-z) and digits (0-9). `,
            }),
    },
    params: {},
    query: {}
})

export const checkingAccess = Joi.object({
    body: {
        lectureId: Joi.string()
            .regex(/^[A-Za-z0-9]{24}$/)
            .required()
            .messages({
                'string.pattern.base': `Lecture ID must be a valid ObjectId`,
            }),
    },
    params: {},
    query: {}
})


export const getLectureByIdSchema = Joi.object({
    body: {},
    params: {
        lectureId: Joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': `Lecture ID must be a valid ObjectId`,
            })
    },
    query: {}
})