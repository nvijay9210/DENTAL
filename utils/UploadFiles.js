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

      const tenant_id = req.body.tenant_id || req.params.tenant_id;
      const id = req.params.clinic_id || req.params.patient_id || req.params.dentist_id;

      if (id) {
        console.log('update validation activated');
        await updateValidationFn(id, req.body, tenant_id);
      } else {
        console.log('create validation activated');
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

          for (let i = 0; i < files.length; i++) {
            const file = files[i];

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

            const fileName = `${fileField.fieldName}_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
            const savedPath = await saveFile(resizedImage, fieldTenantPath, fileName);

            // ✅ Get description from body using index
            const descriptionKey = `description_${fileField.fieldName}_${i}`;
            const description = req.body[descriptionKey] || "No description";

            savedPaths.push({
              path: savedPath,
              description: description,
            });
          }

          // ✅ Store structured data in req.body
          if (fileField.multiple) {
            req.body[fileField.fieldName] = savedPaths; // array of { path, description }
          } else {
            req.body[fileField.fieldName] = savedPaths[0]; // single object { path, description }
          }

          uploadedFiles[fileField.fieldName] = savedPaths;
        }
      }

      console.log("Uploaded files:", uploadedFiles);
      next();

    } catch (error) {
      console.error("Error uploading files:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };
};

module.exports = { uploadFileMiddleware };