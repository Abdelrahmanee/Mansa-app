import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../utilies/error.js';

// Memory storage for images only
const memoryStorage = multer.memoryStorage();

// Custom storage engine for videos and PDFs to upload directly to Cloudinary
const cloudinaryStorage = {
  _handleFile(req, file, cb) {
    if (file.mimetype.startsWith('video') || file.mimetype === 'application/pdf') {
      const resourceType = file.mimetype.startsWith('video') ? 'video' : 'auto';

      // Upload the file directly to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream({ resource_type: resourceType, folder: 'Mansa/Lectures' }, (error, result) => {
        if (error) {
          cb(new AppError(`Cloudinary upload error: ${error.message}`, 500));
        } else {
          // Attach Cloudinary result to the file object
          file.cloudinaryResult = result;
          cb(null, file); // Proceed after successful upload
        }
      });

      // Directly send the file's buffer to the Cloudinary upload stream
      file.stream.pipe(uploadStream);
    } else {
      cb(new AppError('Invalid file type. Only videos and PDFs allowed for this storage.', 403));
    }
  },
  _removeFile(req, file, cb) {
    // No need for removal since the file is not stored on disk
    cb(null);
  }
};

// File filter to validate file types
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith('image') ||
    file.mimetype.startsWith('video') ||
    file.mimetype === 'application/pdf'
  ) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only images, videos, and PDFs are allowed.', 403), false);
  }
};

// Combine memory storage for images and Cloudinary storage for videos and PDFs
const multerStorage = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    // Use memory storage for images
    memoryStorage._handleFile(req, file, cb);
  } else {
    // Use Cloudinary for videos and PDFs
    cloudinaryStorage._handleFile(req, file, cb);
  }
};

// Setup Multer with the combined storage
const upload = multer({
  storage: {
    _handleFile: multerStorage,
    _removeFile: (req, file, cb) => {
      if (file.mimetype.startsWith('image')) {
        memoryStorage._removeFile(req, file, cb);
      } else {
        cloudinaryStorage._removeFile(req, file, cb);
      }
    }
  },
  fileFilter,
});

// Usage for single file upload (used for images in the controller)
export const uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

// Usage for multiple file uploads (used for videos and PDFs)
export const uploadMultiple = (fields) => {
  return upload.fields(fields);
};
