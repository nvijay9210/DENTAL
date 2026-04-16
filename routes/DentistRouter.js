const express = require("express");
const multer = require("multer");
const router = express.Router();
const dentistController = require("../controllers/DentistController");
const routerPath = require("./RouterPath");
const { uploadFileMiddleware, uploadFileMiddleware2 } = require("../utils/UploadFiles");
const dentistValidation = require("../validations/DentistValidation");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

// Setup multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

// router.use(multiTenantAuthMiddleware)

// Common upload fields
// const dentistUploadFields = upload.fields([
//   { name: "profile_picture", maxCount: 1 },
//   { name: "awards_certifications", maxCount: 10 },
// ]);

// File middleware options
const dentistImageFileleMiddleware = uploadFileMiddleware2({
  folderName: "Dentist",
  fileFields: [
    {
      fieldName: "profile_picture",
      maxSizeMB: 2,
      multiple: false
    }
  ],
  createValidationFn: dentistValidation.createDentistValidation,
  updateValidationFn: dentistValidation.updateDentistValidation,
});
const dentistFileMiddleware = uploadFileMiddleware({
  folderName: "Dentist",
  fileFields: [
    {
      fieldName: "awards_certifications",
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
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  upload.any(),
  dentistImageFileleMiddleware, // For profile picture
  dentistFileMiddleware,
  dentistController.createDentist
);

// Get All Dentists by Tenant ID
router.get(
  routerPath.GETALL_PUBLIC_DENTIST_TENANT,
  // authenticateTenantClinicGroup(["tenant","superuser","patient","receptionist","guest"]),
  dentistController.getAllPublicDentistByTenantId
);
router.get(
  routerPath.GETALL_DENTIST_TENANT,
  authenticateTenantClinicGroup(["tenant","superuser","patient","receptionist","guest"]),
  dentistController.getAllDentistsByTenantId
);

// Get Dentist by Clinic ID and Dentist ID
router.get(
  routerPath.GET_DENTIST_TENANT,
  authenticateTenantClinicGroup([
    "guest",
    "tenant",
    "superuser",
    "receptionist",
    "patient",
    "dentist"
  ]),
  dentistController.getDentistByTenantIdAndDentistId
);

router.get(
  routerPath.GET_DENTIST_TENANT_CLINIC,
  authenticateTenantClinicGroup([
    "guest",
    "superuser",
    "dentist",
    "tenant",
    "receptionist",
    "patient"
  ]),
  dentistController.getAllDentistByTenantIdAndClientId
);

// Update Dentist
router.put(
  routerPath.UPDATE_DENTIST_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist"
  ]),
  // dentistUploadFields,
  upload.any(),
  dentistImageFileleMiddleware, // For profile picture
  dentistFileMiddleware,
  dentistController.updateDentist
);

// Delete Dentist
router.delete(
  routerPath.DELETE_DENTIST_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser"
  ]),
  dentistController.deleteDentistByTenantIdAndDentistId
);

module.exports = router;
