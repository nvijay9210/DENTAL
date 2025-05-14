const express = require("express");
const multer = require("multer");
const router = express.Router();
const dentistController = require("../controllers/DentistController");
const routerPath = require("./RouterPath");
const { uploadFileMiddleware } = require("../utils/UploadFiles");
const dentistValidation = require("../validations/DentistValidation");

// Setup multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Common upload fields
const dentistUploadFields = upload.fields([
  { name: "profile_picture", maxCount: 1 },
  { name: "awards_certifications", maxCount: 10 },
]);

// File middleware options
const dentistFileMiddleware = uploadFileMiddleware({
  folderName: "Dentist",
  fileFields: [
    {
      fieldName: "profile_picture",
      subFolder: "Photos",
      maxSizeMB: 2,
      multiple: false,
    },
    {
      fieldName: "awards_certifications",
      subFolder: "Documents",
      maxSizeMB: 10,
      multiple: true,
    },
    // { fieldName: "aadhaar_back", subFolder: "Documents", maxSizeMB: 5, multiple: false },
    // { fieldName: "medical_reports", subFolder: "Documents", maxSizeMB: 5, multiple: true },
  ],
  createValidationFn: dentistValidation.createDentistValidation,
  updateValidationFn: dentistValidation.updateDentistValidation,
});

// Add Dentist
router.post(
  routerPath.ADD_DENTIST,
  dentistUploadFields,
  dentistFileMiddleware,
  dentistController.createDentist
);

// Get All Dentists by Tenant ID
router.get(
  routerPath.GETALL_DENTIST_TENANT,
  dentistController.getAllDentistsByTenantId
);

// Get Dentist by Clinic ID and Dentist ID
router.get(
  routerPath.GET_DENTIST_TENANT,
  dentistController.getDentistByTenantIdAndDentistId
);

router.get(
  routerPath.GET_DENTIST_TENANT_CLINIC,
  dentistController.getAllDentistByTenantIdAndClientId
);

// Update Dentist
router.put(
  routerPath.UPDATE_DENTIST_TENANT,
  dentistUploadFields,
  dentistFileMiddleware,
  dentistController.updateDentist
);

// Delete Dentist
router.delete(
  routerPath.DELETE_DENTIST_TENANT,
  dentistController.deleteDentistByTenantIdAndDentistId
);

module.exports = router;
