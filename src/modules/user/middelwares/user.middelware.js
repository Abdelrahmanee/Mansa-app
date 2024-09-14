import { AppError, catchAsyncError } from "../../../utilies/error.js";
import { userModel } from "../models/user.model.js";






export const checkUserOtp = catchAsyncError(async (req, res, next) => {
    const { otp, identifier } = req.body

    const user = await userModel.findOne({ $or: [{ email: identifier }, { mobileNumber: identifier }], otp, resetPasswordExpires: { $gt: Date.now() } })
    if (!user) next(new AppError("otp is not valid or expires", 400))
    req.user = user;
    next();
})


export const checkBlockStatus = async (req, res, next) => {
    try {
        const currentUserId = req.user._id; // Assuming user is attached to req
        const targetUserId = req.params.id; // Assuming userId is a route parameter

        // Fetch the current user's data
        const currentUser = await userModel.findById(currentUserId).select('blockedUsers');
        if (!currentUser) {
            return res.status(404).json({ message: 'Current user not found' });
        }

        // Fetch the target user's data
        const targetUser = await userModel.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ message: 'Target user not found' });
        }

        // Check if the current user has blocked the target user
        const isBlocked = currentUser.blockedUsers.some(blocked => blocked.userId.equals(targetUserId));

        // Check if the target user has blocked the current user
        const isBlocking = targetUser.blockedUsers.some(blocked => blocked.userId.equals(currentUserId));

        if (isBlocked || isBlocking) {
            return res.status(403).json({ status: "faild", message: 'Access denied' });
        }

        // Allow access
        next();
    } catch (err) {
        next(err);
    }
};

