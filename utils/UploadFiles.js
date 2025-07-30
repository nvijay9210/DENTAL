const fs = require("fs");
const path = require("path");
const { compressImage } = require("./ImageCompress");
const { relativePath } = require("./RelativePath");

const uploadFileMiddleware = (options) => {
  const {
    folderName,
    fileFields, // [{ fieldName, subFolder, maxSizeMB, multiple }]
    createValidationFn,
    updateValidationFn,
  } = options;

  return async (req, res, next) => {
    try {
      // Ensure folder exists
      const ensureFolderExists = (folderPath) => {
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
      };

      // Save file to disk and return relative path
      const saveFile = async (buffer, outputPath, fileName) => {
        ensureFolderExists(outputPath);
        const filePath = path.join(outputPath, fileName);
        fs.writeFileSync(filePath, buffer);
        return relativePath(filePath);
      };

      const uploadedFiles = {};
      const tenant_id = req.body.tenant_id || req.params.tenant_id;
      let id = 0;

      switch (folderName) {
        case "Notification":
          id = req.params.notification_id;
          break;
        case "Expense":
          id = req.params.expense_id;
          break;
        case "Supplier_products":
          id = req.params.supplier_product_id;
          break;
        case "Supplier":
          id = req.params.supplier_id;
          break;
        case "Reception":
          id = req.params.reception_id;
          break;
        case "Asset":
          id = req.params.asset_id;
          break;
        case "Treatment":
          id = req.params.treatment_id;
          break;
        case "Patient":
          id = req.params.patient_id;
          break;
        case "Dentist":
          id = req.params.dentist_id;
          break;
        case "Clinic":
          id = req.params.clinic_id;
          break;
        case "Tenant":
          id = req.params.tenant_id;
          break;
      }

      const settings = req.query.settings || 0;
      if (settings != 1) {
        if (id) {
          await updateValidationFn(id, req.body, tenant_id);
        } else {
          console.log('create')
          await createValidationFn(req.body);
        }
      }

      const baseTenantPath = path.join(
        path.dirname(__dirname),
        "uploads",
        `tenant_${tenant_id}`,
        folderName
      );

      const imageExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".bmp",
        ".webp",
        ".tiff",
      ];

      for (const fileField of fileFields) {
        if (fileField.fieldName === "awards_certifications") {
          const awards = [];
          let idx = 0;
          while (true) {
            const fileFieldName = `awards_certifications_${idx}`;
            const descFieldName = `description_awards_certifications_${idx}`;
            const file = req.files?.find((f) => f.fieldname === fileFieldName);
            const description = req.body[descFieldName];

            if (!file && !req.body[fileFieldName] && !description) break;

            if (file) {
              const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
              if (file.size > maxSizeBytes) {
                return res.status(400).json({
                  message: `Award certification image must be less than ${fileField.maxSizeMB}MB`,
                });
              }

              const extension = path.extname(file.originalname).toLowerCase();
              const dynamicSubFolder = imageExtensions.includes(extension)
                ? "photo"
                : "document";
              const fieldTenantPath = path.join(
                baseTenantPath,
                dynamicSubFolder
              );

              const bufferToSave = imageExtensions.includes(extension)
                ? await compressImage(file.buffer, 100)
                : file.buffer;

              const fileName = `${
                path.parse(file.originalname).name
              }_${Date.now()}_${Math.floor(Math.random() * 10000)}${extension}`;
              const savedPath = await saveFile(
                bufferToSave,
                fieldTenantPath,
                fileName
              );

              awards.push({ image: savedPath, description: description || "" });
            } else if (req.body[fileFieldName]) {
              awards.push({
                image: req.body[fileFieldName],
                description: description || "",
              });
            }

            idx++;
          }
          req.body.awards_certifications = awards;
          uploadedFiles.awards_certifications = awards;
        } else if (fileField.fieldName === "treatment_images") {
          const treatments = [];
          let idx = 0;
          while (true) {
            const fileFieldName = `treatment_images${idx}`;
            const file = req.files?.find((f) => f.fieldname === fileFieldName);
            const existingImagePath = req.body[fileFieldName];
            if (!file && !existingImagePath) break;

            if (file) {
              const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
              if (file.size > maxSizeBytes) {
                return res.status(400).json({
                  message: `Treatment image must be less than ${fileField.maxSizeMB}MB`,
                });
              }

              const extension = path.extname(file.originalname).toLowerCase();
              const dynamicSubFolder = imageExtensions.includes(extension)
                ? "photo"
                : "document";
              const fieldTenantPath = path.join(
                baseTenantPath,
                dynamicSubFolder
              );

              const bufferToSave = imageExtensions.includes(extension)
                ? await compressImage(file.buffer, 100)
                : file.buffer;

              const fileName = `${
                path.parse(file.originalname).name
              }_${Date.now()}_${Math.floor(Math.random() * 10000)}${extension}`;
              const savedPath = await saveFile(
                bufferToSave,
                fieldTenantPath,
                fileName
              );
              treatments.push(savedPath);
            } else if (existingImagePath) {
              treatments.push(existingImagePath);
            }

            idx++;
          }
          req.body.treatment_images = treatments;
          uploadedFiles.treatment_image = treatments;
        } else {
          // Generic file handling (single or multiple)
          const files =
            req.files?.filter(
              (file) => file.fieldname === fileField.fieldName
            ) || [];

          if (files.length > 0) {
            const savedPaths = [];

            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
              if (file.size > maxSizeBytes) {
                return res.status(400).json({
                  message: `${fileField.fieldName.replace(
                    /_/g,
                    " "
                  )} must be less than ${fileField.maxSizeMB}MB`,
                });
              }

              const extension = path.extname(file.originalname).toLowerCase();
              const dynamicSubFolder = imageExtensions.includes(extension)
                ? "photo"
                : "document";
              const fieldTenantPath = path.join(
                baseTenantPath,
                dynamicSubFolder
              );

              const bufferToSave = imageExtensions.includes(extension)
                ? await compressImage(file.buffer, 100)
                : file.buffer;

              const fileName = `${
                path.parse(file.originalname).name
              }_${Date.now()}_${Math.floor(Math.random() * 10000)}${extension}`;
              const savedPath = await saveFile(
                bufferToSave,
                fieldTenantPath,
                fileName
              );

              savedPaths.push(savedPath); // Only push the string path
            }

            // Always store as array of strings
            req.body[fileField.fieldName] = savedPaths;
            uploadedFiles[fileField.fieldName] = savedPaths;
          }
        }
      }

      next();
    } catch (error) {
      console.error("Error uploading files:", error.message);
      return res.status(500).json({ message: error.message });
    }
  };
};

/**
 * Delete a single file if it's inside the uploads folder
 */
const deleteFileIfExists = (filePath) => {
  if (!filePath || typeof filePath !== "string") return;

  const normalizedPath = filePath.replace(/^\/+/, "").replace(/\\/g, "/");

  if (!normalizedPath.startsWith("uploads/")) {
    console.warn("Skipping file deletion (external or invalid):", normalizedPath);
    return;
  }

  const fullPath = path.join(__dirname, "..", normalizedPath);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log("✅ Deleted:", fullPath);
    } catch (err) {
      console.error("❌ Failed to delete:", fullPath, err);
    }
  } else {
    console.warn("⚠️ File not found:", fullPath);
  }
};

/**
 * Delete one or many files from array or string
 */
const deleteUploadedFiles = (filePaths) => {
  if (!filePaths) return;

  if (Array.isArray(filePaths)) {
    for (const item of filePaths) {
      if (typeof item === "string") {
        deleteFileIfExists(item);
      } else if (typeof item === "object" && item.image) {
        // For objects like: { image: 'uploads/...' }
        deleteFileIfExists(item.image);
      }
    }
  } else if (typeof filePaths === "string") {
    deleteFileIfExists(filePaths);
  }
};

/**
 * Extract all awards_certification_* fields from an object
 */
const extractAwardsCertificationFiles = (data) => {
  const files = [];
  for (const key in data) {
    if (key.startsWith("awards_certification_") && typeof data[key] === "string") {
      files.push(data[key]);
    }
  }
  return files;
};

/**
 * Delete all image fields like treatment_images, awards_certification, etc.
 * 
 * @param {*} data - Object containing image fields
 * @param {*} fieldsToCheck - Array of keys like ['treatment_images']
 */
const deleteFilesOnUpdateOrDelete = (data, fieldsToCheck = []) => {
  // Delete from treatment_images: array of strings or objects
  for (const field of fieldsToCheck) {
    if (data[field]) {
      deleteUploadedFiles(data[field]);
    }
  }

  // Special case: awards_certification_* fields
  const awardFiles = extractAwardsCertificationFiles(data);
  if (awardFiles.length > 0) {
    deleteUploadedFiles(awardFiles);
  }
};



module.exports = { uploadFileMiddleware,deleteFileIfExists,deleteUploadedFiles };
