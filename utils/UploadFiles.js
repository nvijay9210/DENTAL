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
      let id=0;
      switch (folderName) {
        case "Clinic":
          id = req.params.clinic_id;
          break;
        case "Dentist":
          id = req.params.dentist_id;
          break;
        case "Patient":
          id = req.params.patient_id;
          break;
        case "Treatment":
          id = req.params.treatment_id;
          break;

        default:
          break;
      }
  
      if (id) {
        console.log("update validation activated");
        await updateValidationFn(id, req.body, tenant_id);
      } else {
        console.log("create validation activated");
        await createValidationFn(req.body);
      }

      const baseTenantPath = path.join(
        path.dirname(__dirname),
        "uploads",
        `tenant_${tenant_id}`,
        folderName
      );

      // Process each file field definition
      for (const fileField of fileFields) {
        // Filter uploaded files whose fieldname starts with this field name
        const files =
          req.files?.filter((file) =>
            file.fieldname.startsWith(fileField.fieldName)
          ) || [];

        if (files.length > 0) {
          const savedPaths = [];

          for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // ✅ Size Check
            const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
            if (file.size > maxSizeBytes) {
              return res.status(400).json({
                message: `${fileField.fieldName.replace(
                  /_/g,
                  " "
                )} must be less than ${fileField.maxSizeMB}MB`,
              });
            }

            // ✅ Compress Image
            const resizedImage = await compressImage(file.buffer, 100);

            // ✅ Construct File Path
            const fieldTenantPath = path.join(
              baseTenantPath,
              fileField.subFolder
            );
            const originalFileName = path.parse(file.originalname).name;
            const extension = path.extname(file.originalname).toLowerCase();
            const fileName = `${originalFileName}_${Date.now()}_${Math.floor(
              Math.random() * 10000
            )}${extension}`;
            const savedPath = await saveFile(
              resizedImage,
              fieldTenantPath,
              fileName
            );

            // ✅ Handle Descriptions
            if (fileField.fieldName === "awards_certifications") {
              const descriptionKey = `description_awards_certifications_${i}`;
              const description = req.body[descriptionKey] || "No description";

              savedPaths.push({
                image: savedPath,
                description: description,
              });
            } else {
              savedPaths.push({
                [fileField.fieldName]: savedPath,
              });
            }
          }

          // ✅ Store structured data in req.body
          if (fileField.multiple) {
            req.body[fileField.fieldName] = savedPaths;
          } else {
            req.body[fileField.fieldName] =
              savedPaths[0]?.[fileField.fieldName];
          }

          uploadedFiles[fileField.fieldName] = savedPaths;
        }
      }

      console.log("Uploaded files:", uploadedFiles);
      next();
    } catch (error) {
      console.error("Error uploading files:", error.message);
      return res.status(500).json({ message: error.message });
    }
  };
};

module.exports = { uploadFileMiddleware };
