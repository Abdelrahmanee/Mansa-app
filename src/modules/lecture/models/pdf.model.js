import mongoose from 'mongoose';

const PDFSchema = new mongoose.Schema({
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture',
    required: true
  },
  PDFURL: {
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

const Pdf = mongoose.model('PDF', PDFSchema);
export default Pdf;
