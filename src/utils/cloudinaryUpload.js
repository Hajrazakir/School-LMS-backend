const cloudinary = require('../config/cloudinary');

/**
 * Uploads a buffer (from multer memoryStorage) to Cloudinary.
 * Returns { url, publicId } so callers can store both and later delete
 * the old asset when it's replaced.
 */
function uploadBufferToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
}

module.exports = { uploadBufferToCloudinary, deleteFromCloudinary };
