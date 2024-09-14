import mongoose from "mongoose";

const schema = new mongoose.Schema({
  studentId: {
    type: mongoose.Types.ObjectId,
    ref: 'User'
  },
  lectureId: {
    type: mongoose.Types.ObjectId,
    ref: 'Lecture'
  },
  accessCodeId: {
    type: mongoose.Types.ObjectId,
    ref: 'LectureAccessCode'
  },
  accessedAt: {
    type: Date,
    default: Date.now
  },
  hasPermanentAccess:{
    type: Boolean,
    default: false
  }
})


export const StudentLectureModel = mongoose.model('StudentLecture', schema);