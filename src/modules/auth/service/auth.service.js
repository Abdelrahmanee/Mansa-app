// services/authService.js
import cloudinary from 'cloudinary';
import { v4 as uuid4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { AppError } from '../../../utilies/error.js';
import { userModel } from '../../user/models/user.model.js';
import { sendEmail } from '../../../utilies/email.js';
import { VERIFICATION_EMAIL_TEMPLATE } from '../../../utilies/htmlTemplate.js';
class AuthService {
    
    // Belongs to registerion
    async checkIfEmailExists(email) {
        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
            throw new AppError('Email exists. Please try another email.', 409);
        }
    }

    async checkIfMobileExists(mobileNumber) {
        const isMobileExist = await userModel.findOne({ mobileNumber });
        if (isMobileExist) {
            throw new AppError('Mobile number exists. Please try another mobile number.', 409);
        }
    }

    async uploadProfilePicture(file) {
        if (!file) return { profilePictureUrl: '', publicId: '' };

        const uploadResponse = await new Promise((resolve, reject) => {
            const stream = cloudinary.v2.uploader.upload_stream(
                { folder: 'Mansa', public_id: uuid4() },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            stream.end(file.buffer);
        });


        return {
            profilePictureUrl: uploadResponse.secure_url,
            publicId: uploadResponse.public_id
        };
    }

    async generateEmailVerificationToken(email) {
        const emailToken = jwt.sign({ email }, process.env.EMAIL_SECRET_KEY, { expiresIn: '1h' });
        const link = `${process.env.BASE_URL}api/v1/auth/confirmEmail/${emailToken}`;
        await sendEmail(email, 'Email Verfication' , VERIFICATION_EMAIL_TEMPLATE , link)
    }

    async createUser(data) {
        return await userModel.create(data);
    }

    normalizeData(data) {
        for (const key in data) {
            if (typeof data[key] === 'string') {
                data[key] = data[key].toLowerCase();
            }
        }
    }

    async generateToken(user) {
        const { email, userName, role, sex, status, age, mobileNumber, _id } = user;

        // Generate the JWT token
        const token = jwt.sign(
            { email, sex, userName, role, status, age, mobileNumber, _id },
            process.env.SECRET_KEY
            // ,{ expiresIn: '1d' }
        );
        return token;
    }

    async checkUserBlocked(user) {
        // Check if user is blocked
        if (user.status === 'blocked') {
            throw new AppError("You have been blocked, contact us", 403);
        }
    }

    async updateUserLoginStatus(user) {
        // Update user status to online and mark as logged in
        user.status = 'online';
        user.isLoggedOut = false;
        await user.save();
    }

    setCookie(res, token) {
        // Set the cookie with the auth token
        res.cookie('authToken', token, {
            httpOnly: false, // Prevents client-side JavaScript from accessing the cookie
            sameSite: 'none', // Use 'none' for cross-origin in production
            secure: true, // Only secure in production
            maxAge: 24 * 60 * 60 * 1000,// 1 day,
            path: '/', // Set the cookie path to the root path
        });
    }

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
            _id: user._id
        };
    }
}

export default new AuthService();
