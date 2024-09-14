import mongoose from 'mongoose'

const schema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true,
    },
    description: {
        type: String,
        required: true,
        unique: true,
    },
    teacherId: {
        type: mongoose.Types.ObjectId,
        ref: 'User'
    },
    logo: {
        type: String,
    },
    price:{
        type: Number,
        required: true,
        default: 100
    },
    duration: {
        type: Number,
        required: true,
        default: 5
    },
    rating: {
        type: Number,
        max: 5,
        required: true,
        default: 0
    },
    pdfs: [],
    videos: [],
}, { timestamps: true }
)


export const lectureModel = mongoose.model('Lecture', schema)