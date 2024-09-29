// services/block.service.js

import { AppError } from "../../../utilies/error.js";
import { blockedUserRepository } from "../repositories/blockedUsers.repostitory.js";
import { userRepository } from "../repositories/user.repository.js";

class BlockService {
    constructor(userRepository, blockedUserRepository) {
        this.userRepository = userRepository;
        this.blockedUserRepository = blockedUserRepository;
    }

    async blockUser(adminId, userIdToBlock, reason) {
        if (adminId === userIdToBlock) {
            throw new AppError('Admins cannot block themselves', 400);
        }

        const userToBlock = await this.userRepository.findById(userIdToBlock);
        if (!userToBlock) {
            throw new AppError('User not found', 404);
        }

        // Check if the user is already blocked
        const isBlocked = await this.blockedUserRepository.findOne({ blockedUser: userIdToBlock });
        if (isBlocked) {
            throw new AppError('User is already blocked', 400);
        }

        // Create a new blocked user entry
        const blockedUser = await this.blockedUserRepository.create({
            blockedUser: userIdToBlock,
            blockedBy: adminId,
            reason,
        });

        return blockedUser;
    }

    async removeUserFromBlockList(adminId, userIdToUnblock) {
        // Find the blocked user document
        const blockedUser = await this.blockedUserRepository.findOne({ blockedUser: userIdToUnblock });
        if (!blockedUser) {
            throw new AppError('User not found in block list', 404);
        }

        const user = await this.userRepository.findById(userIdToUnblock);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        user.status = "offline";
        await this.userRepository.save(user);

        // Remove the document from the block list
        await this.blockedUserRepository.deleteOne({ _id: blockedUser._id });

        return blockedUser;
    }

    async getBlockedUsers() {
        return await this.blockedUserRepository.findAll();
    }
}

// Pass the userRepository and blockedUserRepository instances when creating BlockService
export const blockService = new BlockService(userRepository, blockedUserRepository);
