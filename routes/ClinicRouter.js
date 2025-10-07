const express = require("express");
const multer = require("multer");
const router = express.Router();
const clinicController = require("../controllers/ClinicController");
const { uploadFileMiddleware, uploadFileMiddleware2 } = require("../utils/UploadFiles");
const clinicValidation = require("../validations/ClinicValidation");
const routerPath = require("./RouterPath");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

// Setup multer memory storage once
const upload = multer({ storage: multer.memoryStorage() });

// Setup common file middleware options
const clinicFileMiddleware = uploadFileMiddleware2({
  folderName: "Clinic",
  fileFields: [
    {
      fieldName: "clinic_logo",
      maxSizeMB: 2,
      multiple: false,
    },
  ],
  createValidationFn: clinicValidation.createClinicValidation,
  updateValidationFn: clinicValidation.updateClinicValidation,
});

const clinicFileMiddleware2 = uploadFileMiddleware({
  folderName: "Clinic",
  fileFields: [
    {
      fieldName: "clinic_images",
      maxSizeMB: 5,
      multiple: true,
    },
  ],
  createValidationFn: clinicValidation.createClinicValidation,
  updateValidationFn: clinicValidation.updateClinicValidation,
});

// Add Clinic
router.post(
  routerPath.ADD_CLINIC,
  authenticateTenantClinicGroup(["tenant"]),
  upload.any(),
  clinicFileMiddleware,
  // clinicFileMiddleware2,
  clinicController.createClinic
);

// Get All Clinics by Tenant
router.get(
  routerPath.GETALL_CLINIC_TENANT,
  authenticateTenantClinicGroup(["tenant", "superuser","guest"]),
  //  multiTenantAuthMiddleware,
  clinicController.getAllClinicByTenantId
);

// Get Clinic by Tenant & Clinic ID
router.get(
  routerPath.GET_CLINIC_TENANT,
  authenticateTenantClinicGroup(["tenant","superuser","dentist","receptionist","patient"]),
  clinicController.getClinicByTenantIdAndClinicId
);

// Update Clinic
router.put(
  routerPath.UPDATE_CLINIC_TENANT,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  // clinicUploadFields,
  upload.any(),
  clinicFileMiddleware,
  // clinicFileMiddleware2,
  clinicController.updateClinic
);

// Update Clinic
router.put(
  routerPath.UPDATE_CLINIC_SETTINGS,
  authenticateTenantClinicGroup(["tenant","superuser"]),
  // clinicUploadFields,
  upload.any(),
  clinicFileMiddleware,
  clinicController.updateClinicSettings
);

router.put(
  routerPath.HANDLE_CLINIC_ASSIGNMENT,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  clinicController.handleClinicAssignment
);

// Delete Clinic
router.delete(
  routerPath.DELETE_CLINIC_TENANT,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  clinicController.deleteClinicByTenantIdAndClinicId
);

module.exports = router;
