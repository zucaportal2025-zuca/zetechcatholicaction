const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf"
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function validateFile(file) {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { valid: false, error: "Only JPG, PNG, WEBP, or PDF allowed" };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "File exceeds 5MB limit" };
  }
  return { valid: true };
}

function getFileType(mimeType) {
  if (mimeType === "application/pdf") return "pdf";
  return "image";
}

async function uploadToCloudinary(file, options = {}) {
  const { semesterId = "unassigned" } = options;

  const isPdf = file.mimetype === "application/pdf";
  const resourceType = isPdf ? "raw" : "image";
  const folder = "zuca/treasury/" + semesterId;
  const publicId = "receipt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          fileType: isPdf ? "pdf" : "image",
          format: result.format,
          bytes: result.bytes
        });
      }
    );
    stream.end(file.buffer);
  });
}

async function deleteFromCloudinary(publicId, fileType = "image") {
  const resourceType = fileType === "pdf" ? "raw" : "image";
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
  validateFile,
  getFileType,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES
};
