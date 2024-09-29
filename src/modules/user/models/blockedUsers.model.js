import mongoose from 'mongoose';

const blockedUserSchema = new mongoose.Schema({
    blockedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },  // References the admin who blocked the user
    blockedAt: { type: Date, default: Date.now },  // Timestamp of when the block occurred
    reason: { type: String },  // Optional reason for blocking
}, {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
}
);
// Remove _id from the output
blockedUserSchema.set('toJSON', {
    transform: function (doc, ret) {
        delete ret._id;
        return ret;
    }
});
// Create the model
const BlockedUser = mongoose.model('BlockedUser', blockedUserSchema);

export default BlockedUser;
