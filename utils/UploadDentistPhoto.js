const fs = require("fs");
const path = require("path");
const { compressImage } = require("./ImageCompress");
const { relativePath } = require("./RelativePath");
const dentistValidation = require("../validations/DentistValidation");

const UploadDentistPhoto = async (req, res, next) => {

  try {

    const { dentist_id } = req.params;
    // console.log("Dentist ID:", dentist_id);

    try {
      if (dentist_id) {
        await dentistValidation.updateDentistValidation(dentist_id, req.body);
      } else {
        await dentistValidation.createDentistValidation(req.body);
      }
    } catch (error) {
      console.error("❌ Validation Error:", error); // Debugging
      return next(error); // Ensure the error is passed correctly
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      console.log("No files received.");
      return next(); // Continue even if no files are uploaded
    }

    console.log("Received files:", Object.keys(req.files));

    // Ensure folder existence
    const ensureFolderExists = (folderPath) => {
      if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    };

    // Function to save files
    const saveFile = async (buffer, outputPath, fileName) => {
      try {
        ensureFolderExists(outputPath);
        const filePath = path.join(outputPath, fileName);
        fs.writeFileSync(filePath, buffer);
        return relativePath(filePath);
      } catch (error) {
        console.error("Error saving file:", error);
        throw new AppError("Failed to save file", 400);
      }
    };

    // Initialize uploaded files object
    const uploadedFiles = {};
    const dentistPhoto = req.files?.["profile_picture"]?.[0] || null;
    const idProof = req.files?.["awards_certifications"]?.[0] || null;

    // console.log(dentistPhoto,idProof)

    const tenantPath = path.join(
      __dirname,
      "..",
      "uploads",
      `tenant_${req.body.tenant_id}`,
      "Dentist"
    );
    console.log("Tenant path:", tenantPath);

    if (dentistPhoto) {
      try {
        const resizedImage = await compressImage(dentistPhoto.buffer, 100);
        uploadedFiles.profile_picture = await saveFile(
          resizedImage,
          path.join(tenantPath, "Photos"),
          `dentistPhoto_${Date.now()}.jpg`
        );
        console.log("Dentist photo saved at:", uploadedFiles.profile_picture);
      } catch (error) {
        return next(error); // Pass error to global error handler
      }
    }

    if (idProof) {
      try {
        uploadedFiles.awards_certifications = await saveFile(
          idProof.buffer,
          path.join(tenantPath, "Files"),
          `idProof_${Date.now()}${path.extname(idProof.originalname)}`
        );
        console.log("ID Proof saved at:", uploadedFiles.awards_certifications);
      } catch (error) {
        return next(error); // Pass error to global error handler
      }
    }

    // Assign uploaded files to req.body
    req.body.profile_picture = uploadedFiles.profile_picture || null;
    req.body.awards_certifications = uploadedFiles.awards_certifications || null;

    console.log("Files uploaded successfully:", uploadedFiles);
    next(); // Continue to next middleware/controller
  } catch (error) {
    console.error("❌ Error in uploadDentistFile middleware:", error);
    next(error); // Pass error to global error handler
  }
};


module.exports = { UploadDentistPhoto };
