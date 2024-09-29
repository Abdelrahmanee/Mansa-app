// repositories/blockedUser.repository.js

import BlockedUser from "../models/blockedUsers.model.js";

class BlockedUserRepository {
    async findOne(query) {
        return await BlockedUser.findOne(query);
    }

    async create(data) {
        const blockedUser = new BlockedUser(data);
        return await blockedUser.save();
    }

    async deleteOne(query) {
        return await BlockedUser.deleteOne(query);
    }

    async findAll() {
        return await BlockedUser.find().populate('blockedUser blockedBy', 'userName profilePicture');
    }
}

export const blockedUserRepository = new BlockedUserRepository();
