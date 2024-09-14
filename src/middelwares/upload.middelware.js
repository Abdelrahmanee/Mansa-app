import multer from 'multer';
import path from 'path';
import { AppError } from '../utilies/error.js';

// Configure Disk Storage
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.mimetype.startsWith('video')) {
      cb(null, 'uploads/videos/');
    } else if (file.mimetype.startsWith('application/pdf')) {
      cb(null, 'uploads/pdfs/');
    } else {
      cb(new AppError('Invalid file type for disk storage.', 403), false);
    }
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${path.basename(file.originalname)}`);
  }
});

// Custom storage engine
const customStorage = {
  _handleFile(req, file, cb) {
    if (file.mimetype.startsWith('image')) {
      multer.memoryStorage()._handleFile(req, file, cb);
    } else {
      diskStorage._handleFile(req, file, cb);
    }
  },
  _removeFile(req, file, cb) {
    if (file.mimetype.startsWith('image')) {
      multer.memoryStorage()._removeFile(req, file, cb);
    } else {
      diskStorage._removeFile(req, file, cb);
    }
  }
};

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image') ||
    file.mimetype.startsWith('video') ||
    file.mimetype.startsWith('application/pdf')) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only images, videos, and PDFs are allowed.', 403), false);
  }
};

const upload = multer({
  storage: customStorage,
  fileFilter,
});

// Usage for single file upload
export const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

// Usage for multiple file upload with specific field names
export const uploadMultiple = (fields) => {
  return upload.fields(fields);
};
