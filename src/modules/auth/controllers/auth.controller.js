import jwt from "jsonwebtoken";
import { v4 as uuid4 } from 'uuid';
import cloudinary from 'cloudinary';
import { userModel } from "../../user/models/user.model.js";
// import { sendEmailVerfication } from "../../../utilies/email.js";
import { AppError, catchAsyncError } from "../../../utilies/error.js";
import AuthService from '../service/auth.service.js'
import mongoose from "mongoose";





export const login = catchAsyncError(async (req, res, next) => {
    const user = req.user;
    console.log(req.user);
    
    // Check if the user is blocked
    await AuthService.checkUserBlocked(user);

    // Generate JWT token
    const token = await AuthService.generateToken(user);

    // Update user login status to "online"
    await AuthService.updateUserLoginStatus(user);

    // Set the token in cookies
    AuthService.setCookie(res, token);

    // Send response with user data
    res.status(200).json({
        status: 'success',
        message: "Signed in successfully",
        user: AuthService.formatUserResponse(user),
    });
});



export const signup = catchAsyncError(async (req, res, next) => {
    const { email, mobileNumber } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        await AuthService.checkIfEmailExists(email);
        await AuthService.checkIfMobileExists(mobileNumber);
        AuthService.normalizeData(req.body);
        const user = await AuthService.createUser(req.body, session);
        user.isVerified = false; // Set as unverified initially
        await session.commitTransaction();
        session.endSession();

        // Side effect: Send verification email
        try {
            let x = await AuthService.generateEmailVerificationToken(user.email);
            
            user.emailSent = true; // Email sent successfully
            
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError);
            user.emailSent = false; // Mark as email not sent
        }

        // Save the emailSent flag status
        await user.save();

        // Side effect: Upload profile picture
        try {
            const { profilePictureUrl, publicId } = await AuthService.uploadProfilePicture(req.file);
            user.profilePicture = profilePictureUrl;
        } catch (uploadError) {
            console.error("Failed to upload profile picture:", uploadError);
            // Assign a default profile picture URL
            user.profilePicture = process.env.DEFAULT_PROFILE_PICTURE_URL;
        }

        // Save the profile picture (or the default picture)
        await user.save();

        res.status(201).json({
            status: 'success',
            message: user.emailSent ? 'User added successfully, please verify your email' : 'User added, but email verification failed. Please verify your email manually.',
            data: user
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        return next(new AppError(error.message, 400));
        // return next(new AppError('Registration failed, please try again later', 500));
    }


    // Detailed error handling




    // Generic error message
    // return next(new AppError('Registration failed, please try again later', 500));

});


export const confirm_email = catchAsyncError(async (req, res, next) => {
    try {
        const { token } = req.params;
        const { email } = jwt.verify(token, process.env.EMAIL_SECRET_KEY)


        await userModel.findOneAndUpdate({ email }, { isEmailVerified: true })
        res.status(200).send("Email is confirmed")
    } catch (error) {
        throw new AppError(error.message, 498)
    }
})
