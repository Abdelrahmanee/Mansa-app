import { catchAsyncError } from "../../../utilies/error.js";
import { blockService } from "../services/block.service.js";

// Block a user
export const blockUser = catchAsyncError(async (req, res, next) => {
    const { _id: adminId } = req.user;
    const { id: userIdToBlock } = req.params;
    const { reason } = req.body;

    const blockedUser = await blockService.blockUser(adminId, userIdToBlock, reason);

    res.status(200).json({
        status: "success",
        message: "User blocked successfully",
        data: blockedUser
    });
});

// Unblock a user
export const removeFromBlockList = catchAsyncError(async (req, res, next) => {
    const { _id: adminId } = req.user;
    const { id: userId } = req.params;
    await blockService.removeUserFromBlockList(adminId, userId);

    res.status(200).json({
        status: "success",
        message: "User removed from block list",
    });
});

// Get list of blocked users
export const getBlockedUsers = catchAsyncError(async (req, res, next) => {
    const blockedUsers = await blockService.getBlockedUsers();

    res.status(200).json({
        status: "success",
        data: blockedUsers
    });
});
