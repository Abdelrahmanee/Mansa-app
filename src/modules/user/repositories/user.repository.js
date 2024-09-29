// repositories/user.repository.js

import { userModel } from "../models/user.model.js";

class UserRepository {
    async findById(userId) {
        return await userModel.findById(userId);
    }

    async findByEmailOrMobile(identifier) {
        console.log(userId);
        return await userModel.findOne({ $or: [{ email: identifier }, { mobileNumber: identifier }] });
    }

    async findOne(query) {
        return await userModel.findOne(query);
    }

    async updateById(userId, updates) {
        return await userModel.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true });
    }

    async save(user) {
        return await user.save();
    }

    async deleteById(userId) {
        return await userModel.findByIdAndDelete(userId);
    }
    async findByIdWithLectures(userId) {
        return await userModel.findById(userId).populate({
            path: 'lectures.lectureId',
            model: 'Lecture',
        });
    }

    async findByIdWithFields(userId, fields) {
        return await userModel.findById(userId, fields);
    }

    async comparePassword(user, candidatePassword) {
        return await new Promise((resolve, reject) => {
            user.comparePassword(candidatePassword, (err, isMatch) => {
                if (err) return reject(err);
                resolve(isMatch);
            });
        });
    }

    async findAccounts(query, fields) {
        return await userModel.find(query, fields);
    }




}

export const userRepository = new UserRepository();