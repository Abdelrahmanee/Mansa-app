
// services/user.service.js
import { v4 as uuid4 } from 'uuid';
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../../../utilies/error.js";
import { generateOTP, sendEmail } from '../../../utilies/email.js';
import { PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE } from '../../../utilies/htmlTemplate.js';
import jwt from 'jsonwebtoken';
import cloudinary from 'cloudinary';
import { extractPublicId } from 'cloudinary-build-url';
import dotenv from 'dotenv';
import mongoose, { startSession } from 'mongoose';
import { emailService } from './email.service.js';
dotenv.config();

const defaultProfilePictureUrl = process.env.DEFAULT_PROFILE_PICTURE_URL;

class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository
    }

    async getUserById(userId) {
        if (!userId) {
            throw new AppError('User ID is required', 400);
        }

        // Fetch the user from the repository layer
        const user = await userRepository.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        return user;
    }

    async updateAccount(userId, currentFirstName, currentLastName, body) {
        if (!userId) throw new AppError('User not found', 404);

        const { mobileNumber } = body;

        if (mobileNumber) {
            const isMobileExist = await userRepository.findOne({ mobileNumber });
            if (isMobileExist) throw new AppError('Mobile number exists. Please try another mobile number.', 409);
        }

        const allowedUpdates = ['lastName', 'firstName', 'recoveryEmail', 'DOB', 'city', 'GOV', 'mobileNumber'];
        const updates = {};

        // Check if at least one valid field is present
        const keys = Object.keys(body);
        const isValidOperation = keys.some(key => allowedUpdates.includes(key));
        if (!isValidOperation) throw new AppError('Invalid updates! You must provide at least one valid field.', 400);

        // Prepare updates
        updates.firstName = body.firstName ?? currentFirstName;
        updates.lastName = body.lastName ?? currentLastName;

        keys.forEach(key => {
            if (allowedUpdates.includes(key) && key !== 'firstName' && key !== 'lastName') {
                updates[key] = body[key];
            }
        });

        return await userRepository.updateById(userId, updates);
    }

    async updateProfilePicture(userId, fileBuffer) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (user.profilePicture !== defaultProfilePictureUrl) {
                const publicId = extractPublicId(user.profilePicture);
                if (publicId) {
                    const cloudinaryResult = await cloudinary.uploader.destroy(publicId);
                    if (cloudinaryResult.result !== 'ok') throw new AppError('Cloudinary deletion failed', 500);
                }
            }

            const uploadResponse = await new Promise((resolve, reject) => {
                cloudinary.v2.uploader.upload_stream(
                    { folder: 'Mansa', public_id: uuid4() },
                    (error, result) => {
                        if (error) reject(new AppError('Error uploading image to Cloudinary', 500));
                        else resolve(result);
                    }
                ).end(fileBuffer);
            });

            user.profilePicture = uploadResponse.secure_url;
            await userRepository.save(user);

            await session.commitTransaction();
            session.endSession();
            return user;

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    async updateAccountEmail(userId, currentEmail, newEmail) {
        if (newEmail === currentEmail) throw new AppError("You can't update to the current email", 409);

        const isEmailExist = await userRepository.findOne({ email: newEmail });
        if (isEmailExist) throw new AppError('Email already exists', 409);

        const emailToken = jwt.sign({ email: newEmail }, process.env.EMAIL_SECRET_KEY);
        const link = `${process.env.BASE_URL}api/v1/auth/confirmEmail/${emailToken}`;

        await sendEmail(newEmail, 'Email Verification', VERIFICATION_EMAIL_TEMPLATE, link);

        const user = await userRepository.findById(userId);
        user.email = newEmail;
        user.isEmailVerified = false;
        user.status = 'offline';
        user.isLoggedOut = true;

        await userRepository.save(user);
        return user;
    }

    async deleteAccount(userId) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);

        if (user.profilePicture !== defaultProfilePictureUrl) {
            const publicId = extractPublicId(user.profilePicture);
            if (publicId) await cloudinary.uploader.destroy(publicId);
        }

        return await userRepository.deleteById(userId);
    }

    async sendOTP(identifier) {
        const user = await userRepository.findByEmailOrMobile(identifier);
        if (!user) throw new AppError('User not found', 404);
        if (!user.isEmailVerified) throw new AppError('Confirm email first', 400);

        const otp = generateOTP();
        user.otp = otp;
        user.resetPasswordExpires = Date.now() + 3600000;

        await userRepository.save(user);
        await sendEmail(user.email, "OTP Verification", PASSWORD_RESET_REQUEST_TEMPLATE, otp);

        return { status: "success", message: "OTP sent" };
    }
    async getMyLectures(studentId) {
        const user = await userRepository.findByIdWithLectures(studentId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const lectures = user.lectures.map(lecture => lecture.lectureId);
        return { lectureCount: lectures.length, lectures };
    }

    async getAnotherUserInfo(friendId) {
        if (!friendId) {
            throw new AppError('User not found', 404);
        }

        const user = await userRepository.findByIdWithFields(friendId, 'userName email age status');
        if (!user) {
            throw new AppError('User not found', 404);
        }

        return user;
    }

    async updatePassword(userId, currentPassword, newPassword) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Check if the current password matches
        const isMatch = await userRepository.comparePassword(user, currentPassword);
        if (!isMatch) {
            throw new AppError('Enter a valid current password', 400);
        }

        // Ensure the new password is different from the current one
        if (newPassword === currentPassword) {
            throw new AppError('Try another password', 400);
        }

        // Update the user's password and related fields
        user.password = newPassword;
        user.isLoggedOut = true;
        user.status = 'offline';
        user.passwordChangedAt = Date.now();

        await userRepository.save(user);
    }

    async resetPassword(user, newPassword) {
        // Compare new password with existing password
        const isMatch = await userRepository.comparePassword(user, newPassword);
        if (isMatch) {
            throw new AppError('Please choose a different password.', 400);
        }

        // Set new password and reset relevant fields
        user.password = newPassword;
        user.resetPasswordExpires = null;
        user.otp = null;

        await userRepository.save(user);

        // Send confirmation email
        await emailService.sendEmailToUser(user.email, "Password Reset Successful", PASSWORD_RESET_SUCCESS_TEMPLATE, user.userName);

        return this.formatUserResponse(user);
    }

    // Utility method to format user data
    formatUserResponse(user) {
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
            _id: user._id,
        };
    }
    async getAllAssociatedAccounts(recoveryEmail) {
        let query = {};
        if (recoveryEmail) {
            query.recoveryEmail = recoveryEmail;
        }

        // Fetch all accounts associated with the recovery email
        return await userRepository.findAccounts(query, 'userName');
    }

    async blockUser(userId) {
        // Find and block the user
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (user.isBlocked) {
            throw new AppError('User already blocked', 400);
        }

        user.isBlocked = true;
        user.status = "blocked";
        await userRepository.save(user);
    }

    async softDeleteUser(userId) {
        const user = await userRepository.updateById(userId, { status: 'deleted', isLoggedOut: true });
        if (!user) {
            throw new AppError('User not found', 404);
        }

        return user;
    }

    async logoutUser(userId) {
        // Mark the user as logged out
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        user.status = 'offline';
        user.isLoggedOut = true;

        await userRepository.save(user);

        return user;
    }
    
}

export const userService = new UserService();
