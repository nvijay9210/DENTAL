const fs = require("fs");
const path = require("path");
const { compressImage } = require("./ImageCompress");
const { relativePath } = require("./RelativePath");
const dentistValidation = require("../validations/DentistValidation");

const UploadDentistCertificates = async (req, res, next) => {
  try {
    const ensureFolderExists = (folderPath) => {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
    };

    const saveFile = async (buffer, outputPath, fileName) => {
      ensureFolderExists(outputPath);
      const filePath = path.join(outputPath, fileName);
      fs.writeFileSync(filePath, buffer);
      return relativePath(filePath);
    };

    const uploadedFiles = req.uploadedFiles && Object.keys(req.uploadedFiles).length > 0 
      ? req.uploadedFiles 
      : {};

    const awards_certifications = req.files?.["awards_certifications"] || [];

    await dentistValidation.createDentistValidation(req.body, awards_certifications);

    const tenantPath = path.join(
      path.dirname(__dirname),
      "uploads",
      `tenant_${req.body["tenant_id"]}`,
      "Awards_Certifications"
    );

    if (awards_certifications.length > 0) {
      uploadedFiles.awards_certifications = [];

      for (const file of awards_certifications) {
        const savedPath = await saveFile(
          file.buffer,
          path.join(tenantPath, "Files"),
          `docs_${Date.now()}_${file.originalname}`
        );
        uploadedFiles.awards_certifications.push(savedPath);
      }

      console.log("Document files saved at:", uploadedFiles.awards_certifications);
    }

    req.uploadedFiles = uploadedFiles;
    next();
  } catch (error) {
    console.error("Error uploading certificates:", error);
    return next(error);
  }
};

module.exports = { UploadDentistCertificates };
