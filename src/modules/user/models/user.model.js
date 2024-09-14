import mongoose from "mongoose";
import bcrypt from 'bcrypt'


const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        trim: true,
        minLength: 3,
        maxLength: 500,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        minLength: 3,
        maxLength: 500,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        trim: true,
    },
    recoveryEmail: {
        type: String,
        default: null
    },
    DOB: {
        type: Date,
        required: true
    },
    mobileNumber: {
        type: String,
        unique: true,
        required: true,
        trim: true,
    },
    GOV: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'admin', 'teacher'],
        default: 'student'
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'blocked', 'deleted'],
        default: 'offline',
        required: true,
        trim: true,
    },
    isEmailVerified: {
        type: Boolean,
        required: true,
        default: false,
    },
    otp: {
        type: String,
        length: 6
    },
    resetPasswordExpires: {
        type: Date,
        default: null
    },
    profilePicture: {
        type: String,
    },
    sex: {
        type: String,
        enum: ['male', 'female'],
        required: true
    },
    passwordChangedAt: { type: Date, },
    userName: { type: String },
    age: { type: Number },
    isBlocked: { type: Boolean, default: null },
    lectures: [{
        lectureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Lecture',
        }
    }],
},
    { timestamps: true }
)

// Pre-save hook to hash password and calculate age
userSchema.pre('save', function (next) {
    this.userName = `${this.firstName} ${this.lastName}`;

    if (this.isModified('password')) {
        this.password = bcrypt.hashSync(this.password, +process.env.HASH_SALT_ROUNDS);
    }

    const today = new Date();
    const birthDate = new Date(this.DOB);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    this.age = age;

    next();
});

// Middleware to handle hashing the password on update
userSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();

    // If password is being updated, hash it
    if (update.password) {
        update.password = bcrypt.hashSync(update.password, +process.env.HASH_SALT_ROUNDS);
    }

    // If firstName or lastName is being updated, update userName
    if (update.$set.firstName || update.$set.lastName) {
        const firstName = update.$set.firstName || this.getQuery().firstName;
        const lastName = update.$set.lastName || this.getQuery().lastName;
        update.$set.userName = `${firstName} ${lastName}`;
    }

    // If DOB is being updated, recalculate age
    if (update.$set.DOB) {
        const today = new Date();
        const birthDate = new Date(update.$set.DOB);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        update.$set.age = age;
    }

    next();
});

// Middleware to handle recalculating userName and age on find operations
userSchema.pre(/^find/, function (next) {
    // If userName is not set or needs to be recalculated
    if (!this.userName || this.isModified('firstName') || this.isModified('lastName')) {
        this.userName = `${this.firstName} ${this.lastName}`;
    }

    // Recalculate age if necessary
    const today = new Date();
    const birthDate = new Date(this.DOB);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    this.age = age;

    next();
});

userSchema.methods.comparePassword = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

export const userModel = mongoose.model('User', userSchema)