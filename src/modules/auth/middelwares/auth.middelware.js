import jwt from "jsonwebtoken";
import { userModel } from "../../user/models/user.model.js";
import { AppError, catchAsyncError } from "../../../utilies/error.js";


export const authorize = (...roles) => {
    return catchAsyncError(async (req, res, next) => {
        if (roles.includes(req.user.role)) return next()
        return next(new AppError('you not allowed to access this endpoint', 401))
    })
}

export const authenticate = catchAsyncError(async (req, res, next) => {

    const token = req.header('token')    

    
    if (!token) throw new AppError("Unathenticated", 401)



    let userPayload = null;
    try {
        // Use the synchronous version of jwt.verify to avoid issues with async behavior
        jwt.verify(token, process.env.SECRET_KEY, async (err, payload) => {
            userPayload = payload
        });
    } catch (error) {
        // If there's an error in token verification, handle i
        return next(new AppError(error.message, 498));
    }


    const user = await userModel.findById(userPayload._id)
    if (!user) return next(new AppError("user not found", 404))
    if (user.status === 'offline') return next(new AppError("you must login first", 401))
    if (user.status === 'blocked') return next(new AppError("you have been blocked , contact us", 403))
    if (user.status === 'deleted') return next(new AppError("login again", 403))

    if (user.passwordChangedAt) {
        const time = parseInt(user?.passwordChangedAt.getTime() / 1000)
        if (time > userPayload.iat) return next(new AppError("Invalid token ... login again", 401))
    }
    console.log(userPayload._id);
    req.user = user
    next()
})

export const checkUniqueIdentifier = catchAsyncError(async (req, res, next) => {
    const { email, mobileNumber } = req.body

    const user = await userModel.findOne({ $or: [{ email }, { mobileNumber }] })

    if (user) throw new AppError('User Already exist !', 400)
    next();
})

export const isUserExist = catchAsyncError(async (req, res, next) => {
    const { identifier } = req.body
    const user = await userModel.findOne({ $or: [{ email: identifier }, { mobileNumber: identifier }] })
    !user ? next(new AppError("user is not found", 404)) : next()
})

export const isEmailExist = catchAsyncError(async (req, res, next) => {
    const { email } = req.body
    const user = await userModel.findOne({ email })
    !user ? next(new AppError("email is not valid", 400)) : next()
})

export const checkAccountVerification = catchAsyncError(async (req, res, next) => {
    const { identifier, password } = req.body
    const user = await userModel.findOne({ $or: [{ email: identifier }, { mobileNumber: identifier }] })
    if (!user) throw new AppError('User not found', 404)
    user.comparePassword(password, (err, isMatch) => {
        if (err) {
            return res.status(500).json({ message: 'Server error' });
        }

        if (isMatch) {
            if (!user.isEmailVerified) next(new AppError('you Must verified email !', 400))
            req.user = user
            next();
        } else {
            // Handle failed login
            res.status(400).json({ message: 'Invalid username or password' });
        }
    });


})

