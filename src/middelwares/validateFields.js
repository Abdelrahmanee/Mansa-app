import { AppError } from "../utilies/error.js";
export const validateFields = (schema) => (req, res, next) => {    
    const { error } = schema.validate(req.body, { abortEarly: false });
    console.log(req.body);
    if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        return next(new AppError(errorMessage, 400));
    }
    next();
};