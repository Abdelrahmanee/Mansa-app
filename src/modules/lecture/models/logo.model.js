
import mongoose from 'mongoose';

const logoSchema = new mongoose.Schema({
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture',
    required: true
  },
  logoURL: {
    type: String,
    required: true
  },
  publicId: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const Logo = mongoose.model('Logo', logoSchema);
export default Logo;
