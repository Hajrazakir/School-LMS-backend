const multer = require('multer');
const ApiError = require('../utils/ApiError');

const storage = multer.memoryStorage();

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

function fileFilterFactory(allowedTypes) {
  return (_req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  };
}

const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilterFactory(ALLOWED_IMAGE_TYPES),
});

const uploadDocument = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB - receipts, assignment attachments
  fileFilter: fileFilterFactory(ALLOWED_DOC_TYPES),
});

module.exports = { uploadImage, uploadDocument };
