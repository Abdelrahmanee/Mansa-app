import jwt from 'jsonwebtoken'
import { v4 as uuid4 } from 'uuid';
import cloudinary from 'cloudinary';
import { extractPublicId } from 'cloudinary-build-url'
import { userModel } from "../models/user.model.js";
import mongoose, { startSession } from 'mongoose';
import dotenv from 'dotenv'
import { AppError, catchAsyncError } from "../../../utilies/error.js";
import { generateOTP, sendEmail } from '../../../utilies/email.js';
import { StudentLectureModel } from '../../lecture/models/StudentLecture.model.js';
import { PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE } from '../../../utilies/htmlTemplate.js';
import { lectureModel } from '../../lecture/models/lecture.model.js';
dotenv.config()
const defaultProfilePictureUrl = process.env.DEFAULT_PROFILE_PICTURE_URL

// update account.
export const updateAccount = catchAsyncError(async (req, res, next) => {
    const { _id, firstName: currentFirstName, lastName: currentLastName } = req.user;

    if (!_id) {
        return next(new AppError('User not found', 404));
    }

    const { mobileNumber } = req.body

    if (mobileNumber) {
        const isMobileExist = await userModel.findOne({ mobileNumber });
        if (isMobileExist) {
            throw new AppError('Mobile number exists. Please try another mobile number.', 409);
        }
    }

    const allowedUpdates = ['lastName', 'firstName', 'recoveryEmail', 'DOB', 'city', 'GOV', 'mobileNumber'];
    const updates = {};

    // Extract keys from the request body
    const keys = Object.keys(req.body);

    // Check if at least one valid field is present
    const isValidOperation = keys.some(key => allowedUpdates.includes(key));

    if (!isValidOperation) {
        return next(new AppError('Invalid updates! You must provide at least one valid field.', 400));
    }

    // Add allowed fields to the updates object
    if (req.body.firstName !== undefined) {
        updates.firstName = req.body.firstName;
    } else {
        updates.firstName = currentFirstName; // Preserve current firstName if not updated
    }

    if (req.body.lastName !== undefined) {
        updates.lastName = req.body.lastName;
    } else {
        updates.lastName = currentLastName; // Preserve current lastName if not updated
    }

    // Handle other fields
    keys.forEach(key => {
        if (allowedUpdates.includes(key) && key !== 'firstName' && key !== 'lastName') {
            updates[key] = req.body[key];
        }
    });


    // Update the user with the allowed fields
    const user = await userModel.findByIdAndUpdate(_id, { $set: updates }, { new: true, runValidators: true });

    if (!user) {
        return next(new AppError('User not found or update failed', 404));
    }

    const formatUserResponse = (user) => {
        return {
            email: user.email.toLowerCase(),
            userName: user.userName.toLowerCase(),
            role: user.role.toLowerCase(),
            status: user.status.toLowerCase(),
            sex: user.sex.toLowerCase(),
            age: user.age,
            profilePicture: user.profilePicture,
            mobileNumber: user.mobileNumber,
            city: user.city,
            GOV: user.GOV,
            DOB: user.DOB,
            _id: user._id
        };
    }

    res.status(200).json({
        status: "success",
        message: 'User updated successfully',
        data: formatUserResponse(user)
    });
});

export const updateProfilePicture = catchAsyncError(async (req, res, next) => {
    // Check if a file was uploaded

    const session = await mongoose.startSession()
    session.startTransaction()
    if (!req.file) {
        return next(new AppError('No file uploaded', 400));
    }

    // Extract the user ID from the request
    const { _id } = req.user;
    if (!_id) {
        return next(new AppError('User not found', 404));
    }

    // Check if the user exists
    const user = await userModel.findById(_id);
    if (!user) {
        return next(new AppError('User not found', 404));
    }


    const oldProfilePictureUrl = user.profilePicture;
    if (oldProfilePictureUrl && oldProfilePictureUrl !== defaultProfilePictureUrl) {
        const oldPublicId = extractPublicId(user.profilePicture);

        if (oldPublicId) {
            try {
                const cloudinaryResult = await cloudinary.uploader.destroy(oldPublicId);

                if (cloudinaryResult.result !== 'ok') {
                    throw new AppError('Cloudinary deletion failed', 500);
                }
            } catch (error) {
                // If the Cloudinary deletion fails, abort the MongoDB transaction
                console.error('Error deleting Cloudinary image:', error);
                await session.abortTransaction(); // Abort the transaction
                session.endSession();
                return next(new AppError('Failed to delete user account due to external service failure', 500)); // Pass the error to the global error handler
            }
        }
    }


    // Upload the new profile picture to Cloudinary
    let newProfilePictureUrl = '';
    try {
        const uploadResponse = await new Promise((resolve, reject) => {
            cloudinary.v2.uploader.upload_stream(
                { folder: 'Mansa', public_id: uuid4() },
                (error, result) => {
                    if (error) {
                        reject(new AppError('Error uploading image to Cloudinary', 500));

                    } else {
                        resolve(result);
                    }
                }
            ).end(req.file.buffer);
        });

        newProfilePictureUrl = uploadResponse.secure_url;
    } catch (error) {
        await session.abortTransaction(); // Abort the transaction
        session.endSession();
        return next(new AppError('Error uploading image to Cloudinary', 500));
    }

    // Update the user with the new profile picture URL
    user.profilePicture = newProfilePictureUrl;
    await user.save();

    res.status(200).json({
        message: 'Profile picture updated successfully',
        user
    });
});





export const updateAccountEmail = catchAsyncError(async (req, res, next) => {
    const { _id: userId, email: userEmail } = req.user
    const { email } = req.body

    if (!userId) { return next(new AppError('User not found', 404)) };
    if (email === userEmail) { return next(new AppError("you can't update your email to your current email", 409)) };
    const isEmailExist = await userModel.findOne({ email })
    if (isEmailExist) { return next(new AppError('try another email', 409)) };

    const email_token = jwt.sign({ email }, process.env.EMAIL_SECRET_KEY)
    const link = process.env.BASE_URL + `api/v1/auth/confirmEmail/${email_token}`
    await sendEmail(email, 'Email Verfication', VERIFICATION_EMAIL_TEMPLATE, link)
    req.user.email = email
    req.user.status = "offline"
    req.user.isEmailVerified = false
    req.user.isLoggedOut = true
    await req.user.save()
    res.status(200).json({
        status: "success",
        message: "user email updated please login again",
        date: req.user
    })
})


// Delete account
export const deleteAccount = catchAsyncError(async (req, res, next) => {
    const { _id: userId } = req.user; // Assuming the user ID is passed as a URL parameter

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Find the user within the transaction
        const user = await userModel.findById(userId).session(session);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Handle Cloudinary deletion for the user's profile picture
        if (user.profilePicture && user.profilePicture !== defaultProfilePictureUrl) {
            const publicId = extractPublicId(user.profilePicture);
            console.log("publicId");

            if (publicId) {
                try {
                    const cloudinaryResult = await cloudinary.uploader.destroy(publicId);

                    if (cloudinaryResult.result !== 'ok') {
                        throw new Error('Cloudinary deletion failed');
                    }

                } catch (error) {
                    // If the Cloudinary deletion fails, abort the MongoDB transaction
                    console.error('Error deleting Cloudinary image:', error);
                    await session.abortTransaction(); // Abort the transaction
                    session.endSession();
                    return next(new AppError('Failed to delete user account due to external service failure', 500)); // Pass the error to the global error handler
                }
            }
        }

        // Proceed to delete the user from the database
        await userModel.findByIdAndDelete(userId).session(session);

        // Commit the transaction if everything succeeded
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            status: 'success',
            message: 'User deleted successfully',
        });

    } catch (error) {
        // In case of any error, abort the transaction and end the session
        await session.abortTransaction();
        session.endSession();
        return next(error); // Pass error to global error handler
    }
});
// Get user account data 
export const userInfo = catchAsyncError(async (req, res, next) => {
    const { _id } = req.user
    if (!_id) { return next(new AppError('User not found', 404)) };
    const user = await userModel.findById(_id)
    res.status(200).json({ user })
})
export const getMyLectures = catchAsyncError(async (req, res, next) => {
    const { _id: studentId } = req.user;

    const user = await userModel.findById(studentId).populate({
        path: 'lectures.lectureId',
        model: 'Lecture',
    });

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    const lectures = user.lectures.map(lecture => lecture.lectureId);

    res.status(200).json({ lectureCount: lectures.length, lectures });
});


// Get profile data for another user 

export const anotherUserInfo = catchAsyncError(async (req, res, next) => {
    const { id: friend_id } = req.params;
    if (!friend_id) { return next(new AppError('User not found', 404)) };

    const user = await userModel.findById(friend_id, 'userName email age status')
    res.status(200).json({ user })
})

//  Update password 
export const updatePassword = catchAsyncError(async (req, res, next) => {
    const { _id } = req.user;
    if (!_id) { return next(new AppError('Not allowed', 401)); }

    const { current_password, new_password } = req.body;

    // Fetch the user by ID
    const user = await userModel.findById(_id);
    if (!user) {
        return next(new AppError('User not found', 404));
    }

    // Check if the current password matches
    const isMatch = await new Promise((resolve, reject) => {
        user.comparePassword(current_password, (err, isMatch) => {
            if (err) reject(err);
            resolve(isMatch);
        });
    });

    if (!isMatch) {
        return next(new AppError('Enter a valid current password', 400));
    }

    // Check if new password is the same as the current password
    if (new_password === current_password) {
        return next(new AppError('Try another password', 400));
    }

    // Update the password
    user.password = new_password;
    user.isLoggedOut = true;
    user.status = 'offline';
    user.passwordChangedAt = Date.now(); // Optional: track when the password was last changed

    await user.save(); // This will trigger the pre-save hook to hash the password

    res.status(200).json({
        status: 'success',
        message: 'Account password updated successfully',
    });
});
// Forget password 

export const sendOTP = catchAsyncError(async (req, res, next) => {


    const { identifier } = req.body;

    const user = await userModel.findOne({ $or: [{ email: identifier }, { mobileNumber: identifier }] })
    if (!user) throw new AppError("user is not found", 404)
    if (!user.isEmailVerified) throw new AppError("confirm email first", 400)
    const otp = generateOTP();;
    user.otp = otp;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();
    await sendEmail(user.email, "Otp Verfication ", PASSWORD_RESET_REQUEST_TEMPLATE, otp)


    res.status(200).json({ status: "success", message: 'OTP is sent' })
})
// reset password

export const resetPassword = catchAsyncError(async (req, res, next) => {

    const { new_password } = req.body;

    // Compare new password with existing password
    const isMatch = await new Promise((resolve, reject) => {
        req.user.comparePassword(new_password, (err, isMatch) => {
            if (err) return reject(err);
            resolve(isMatch);
        });
    });

    // If the new password is the same as the old one, throw an error
    if (isMatch) return next(new AppError('Please choose a different password.', 400));

    // Set new password and reset relevant fields
    req.user.password = new_password;
    req.user.resetPasswordExpires = null;
    req.user.otp = null;

    // Save the updated user
    await req.user.save();

    // Send email confirmation
    await sendEmail(req.user.email, "Password Reset Successful", PASSWORD_RESET_SUCCESS_TEMPLATE, req.user.userName);

    // Format user data for response
    const formatUserResponse = (user) => ({
        email: user.email.toLowerCase(),
        userName: user.userName.toLowerCase(),
        role: user.role.toLowerCase(),
        status: user.status.toLowerCase(),
        sex: user.sex.toLowerCase(),
        age: user.age,
        profilePicture: user.profilePicture,
        mobileNumber: user.mobileNumber,
        city: user.city,
        GOV: user.GOV,
        DOB: user.DOB,
        _id: user._id
    });

    // Respond with success message and user data
    res.status(200).json({
        status: "success",
        message: 'Password reset successfully',
        user: formatUserResponse(req.user)
    });
});


// Get all accounts associated to a specific recovery Email 


export const getAllAccountsAssociated = catchAsyncError(async (req, res, next) => {
    const { recoveryEmail } = req.body;

    // Build the query object
    let query = {};
    if (recoveryEmail) {
        query.recoveryEmail = recoveryEmail;
    }

    try {
        const Accounts = await userModel.find(query, { userName: 1 });
        res.status(200).json({ status: "success", Accounts });
    } catch (error) {
        next(error); // Pass any error to the error handling middleware
    }
});


export const kickUserOut = catchAsyncError(async (req, res, next) => {
    const { id } = req.params;

    // Find and update the user
    const isUser = await userModel.findById(id)
    if (!isUser) return next(new AppError('User not found', 404));
    console.log(isUser);
    if (isUser.isBlocked === true) return next(new AppError('User already blocked', 400));
    isUser.isBlocked = true

    await isUser.save()
    res.status(200).json({
        status: 'success',
        message: `Account is  blocked`,
    });
});

export const softDeleteUser = catchAsyncError(async (req, res, next) => {
    const { _id } = req.user;

    // Mark the user as deleted
    const user = await userModel.findByIdAndUpdate(_id, { status: 'deleted', isLoggedOut: true }, { new: true });

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        message: 'Account deleted successfully',
        data: {
            user
        }
    });
});


export const userLoggedOut = catchAsyncError(async (req, res, next) => {
    const { _id } = req.user;

    // Mark the user as logged out
    const user = await userModel.findById(_id);

    if (!user) return next(new AppError('User not found', 404));

    user.status = 'offline',
        user.isLoggedOut = true,
        await user.save();
    res.status(200).json({
        status: 'success',
        message: 'User logged out successfully',
        data: {
            user
        }
    });
});

export const blockUser = catchAsyncError(async (req, res, next) => {
    const { _id } = req.user; // ID of the user who is blocking
    const { id: userIdToBlock } = req.params; // ID of the user to be blocked

    if (_id.toString() === userIdToBlock) return next(new AppError('User can not block him self', 404));

    // Check if the user to be blocked exists
    const userToBlock = await userModel.findById(userIdToBlock);

    if (!userToBlock) return next(new AppError('User not found', 404));


    const isInBlockList = req.user.blockedUsers.find((user) => user.userId.toString() === userIdToBlock);
    if (isInBlockList) return next(new AppError('User in your block list', 404));

    req.user.blockedUsers.push({
        userId: userIdToBlock,
        userName: `${userToBlock.firstName} ${userToBlock.lastName}`,
        profilePicture: userToBlock.profilePicture
    });

    await req.user.save();

    res.status(200).json({
        status: "success",
        message: `${userToBlock.userName} has been blocked successfully.`,
        user: req.user
    });


    res.status(200).json({
        status: "success",
        message: `${userToBlock.userName} has been blocked successfully.`,
        user: req.user
    });
});


export const userBlockedList = catchAsyncError(async (req, res, next) => {

    const { _id } = req.user
    const user = await userModel.findById(_id)
    if (!user) return next(new AppError('User not found', 404));
    res.status(200).json({
        status: "success",
        data: user.blockedUsers
    })
})


export const removeFromBlockList = catchAsyncError(async (req, res, next) => {
    const { _id } = req.user
    if (!_id) return next(new AppError("user not found", 404))
    const { id: removedUser } = req.body

    const userIndex = req.user.blockedUsers.findIndex((user) => user.userId.toString() === removedUser)
    if (userIndex < 0) throw new AppError("user not found", 404)


    req.user.blockedUsers.splice(userIndex, 1)
    await req.user.save()
    res.status(200).json({
        status: "success",
        message: "user removed from your block list",
    })
})