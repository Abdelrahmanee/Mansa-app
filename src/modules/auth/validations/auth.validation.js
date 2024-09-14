import Joi from "joi";


export const signinSchema = Joi.object({
    body: {
        identifier: Joi.string().required(),
        password: Joi.string().pattern(new RegExp('^[1-9]')).required()
    },
    params: {},
    query: {}
})

export const signupSchema = Joi.object({
    body: {
        email: Joi.string().email().required(),
        recoveryEmail: Joi.string().email(),
        password: Joi.string().pattern(new RegExp('^[1-9]')).required(),
        firstName: Joi.string().min(2).max(100).required(),
        lastName: Joi.string().min(2).max(100).required(),
        city: Joi.string().min(2).max(100).required(),
        GOV: Joi.string().min(2).max(100).required(),
        DOB: Joi.date().required(),
        mobileNumber: Joi.string().required(),
        sex: Joi.string().valid('male', 'female').required(),
        role: Joi.string(),
    },
    params: {},
    query: {},
    file : Joi.object().required()
})