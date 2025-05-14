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
      // Utility: Ensure folder exists
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
      const id =
        req.params.clinic_id ||
        req.params.patient_id ||
        req.params.dentist_id;

       
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

      // Process each file field
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

            // ✅ Use field name as key instead of 'path'
            if (fileField.fieldName === "awards_certifications") {
              const descriptionKey = `description_awards_certifications_${i}`;
              const description = req.body[descriptionKey] || "No description";

              savedPaths.push({
                [fileField.fieldName]: savedPath,
                description: description,
              });
            } else {
              savedPaths.push({
                [fileField.fieldName]: savedPath
              });
            }
          }

          // ✅ Store structured data in req.body
          if (fileField.multiple) {
            req.body[fileField.fieldName] = savedPaths;
          } else {
            // For single files, store just the value directly
            req.body[fileField.fieldName] = savedPaths[0]?.[fileField.fieldName];
          }

          uploadedFiles[fileField.fieldName] = savedPaths;
        }
      }

      console.log("Uploaded files:", uploadedFiles);
      next();

    } catch (error) {
      console.error("Error uploading files:", error.message);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  };
};

module.exports = { uploadFileMiddleware };