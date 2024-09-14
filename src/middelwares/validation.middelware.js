import { AppError } from "../utilies/error.js"


export const validate = (schema) => {
    return (req, res, next) => {       
        const { error } = schema.validate(
            {
                body: req.body,
                params: req.params,
                query: req.query,
                ...(req.file && { file: req.file }),
                ...(req.files ? { files: req.files } : null),
            },
            { abortEarly: false }
        )
        if (error) {
            console.log(error);
            
            throw new AppError(
                error.details.map((d) => d.message.split('"').join('')),
                400
            )
        }
        next()
    }
}

