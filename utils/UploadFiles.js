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
      const ensureFolderExists = (folderPath) => {
        if (!fs.existsSync(folderPath))
          fs.mkdirSync(folderPath, { recursive: true });
      };

      const saveFile = async (buffer, outputPath, fileName) => {
        ensureFolderExists(outputPath);
        const filePath = path.join(outputPath, fileName);
        fs.writeFileSync(filePath, buffer);
        return relativePath(filePath);
      };

      const uploadedFiles = {};

      const tenant_id= req.body.tenant_id || req.params.tenant_id;
      const id = req.params.clinic_id || req.params.patient_id || req.params.dentist_id;

      if (id) {
        await updateValidationFn(id, req.body, tenant_id);
      } else {
        await createValidationFn(req.body);
      }

      const baseTenantPath = path.join(
        path.dirname(__dirname),
        "uploads",
        `tenant_${tenant_id}`,
        folderName
      );

      for (const fileField of fileFields) {
        const files = req.files?.[fileField.fieldName] || [];

        if (files.length > 0) {
          const savedPaths = [];

          for (const file of files) {
            // ✅ Size Check
            const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
            if (file.size > maxSizeBytes) {
              return res.status(400).json({
                message: `${fileField.fieldName.replace(/_/g, " ")} must be less than ${fileField.maxSizeMB}MB`,
              });
            }

            // ✅ Save file
            const resizedImage = await compressImage(file.buffer, 100);
            const fieldTenantPath = path.join(baseTenantPath, fileField.subFolder);
            const savedPath = await saveFile(
              resizedImage,
              fieldTenantPath,
              `${fileField.fieldName}_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`
            );

            savedPaths.push(savedPath);
          }

          // ✅ Store paths in body
          if (fileField.multiple) {
            req.body[fileField.fieldName] = savedPaths; // Array of paths
          } else {
            req.body[fileField.fieldName] = savedPaths[0]; // Single path
          }

          uploadedFiles[fileField.fieldName] = savedPaths;
        }
      }

      console.log("Uploaded files:", uploadedFiles);
    } catch (error) {
      console.error("Error uploading files:", error);
      return next(error);
    }
    next();
  };
};

module.exports = { uploadFileMiddleware };
