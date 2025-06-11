const path = require("path");
const { v4: uuidv4 } = require("uuid");
  const mime = require("mime-types"); // npm install mime-types
  const { minioClient } = require("./MinioClients");
const uploadToMinio = async (buffer, folderPath, originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const BUCKET_NAME = process.env.MINIO_BUCKET || "dental-bucket";

  const IMAGE_MIME_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
  };

  const isValidImageType = (ext) => {
    return Object.keys(IMAGE_MIME_TYPES).includes(ext.toLowerCase());
  };

  const getContentType = (originalName) => {
    const ext = path.extname(originalName).toLowerCase();
    return (
      IMAGE_MIME_TYPES[ext] ||
      mime.lookup(originalName) ||
      "application/octet-stream"
    );
  };

  if (!isValidImageType(ext)) {
    throw new Error(
      `Unsupported file type: ${ext}. Allowed: .jpg, .jpeg, .png`
    );
  }

  const objectName = `${folderPath}/${uuidv4()}${ext}`;
  const contentType = getContentType(originalName);

  // Ensure bucket exists
  const exists = await minioClient.bucketExists(BUCKET_NAME);
  if (!exists) {
    await minioClient.makeBucket(BUCKET_NAME);
  }

  // Upload file
  await minioClient.putObject(BUCKET_NAME, objectName, buffer, {
    "Content-Type": contentType,
  });

  return `/${BUCKET_NAME}/${objectName}`;
};

module.exports = { uploadToMinio };
