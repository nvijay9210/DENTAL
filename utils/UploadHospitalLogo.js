const fs = require("fs");
const path = require("path");
const { compressImage } = require("./ImageCompress");
const { relativePath } = require("./RelativePath");
const hospitalValidation = require("../validations/HospitalValidation");

const UploadHospitalLogo = async (req, res, next) => {
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
    const clinic_logo = req.files?.["clinic_logo"]?.[0] || null;

    const { hospital_id } = req.params;

    try {
      if (hospital_id) {
        await hospitalValidation.updateHospitalValidation(
          hospital_id,
          req.body
        );
      } else {
        await hospitalValidation.createHospitalValidation(req.body);
      }
    } catch (error) {
      return next(error); // Ensure the error is passed correctly
    }

    const tenantPath = path.join(
      path.dirname(__dirname),
      "uploads",
      `tenant_${req.body["tenant_id"]}`,
      "Hospital"
    );

    if (clinic_logo) {
      const resizedImage = await compressImage(clinic_logo.buffer, 100);
      uploadedFiles.clinic_logo = await saveFile(
        resizedImage,
        path.join(tenantPath, "Photos"),
        `clinic_logo_${Date.now()}.jpg`
      );
    }

    req.uploadedFiles = uploadedFiles;
    console.log("Files uploaded successfully:", uploadedFiles);
  } catch (error) {
    console.error("Error uploading files:", error);
    next(error);
  }
  next();
};

module.exports = { UploadHospitalLogo };
