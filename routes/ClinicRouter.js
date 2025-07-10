const express = require("express");
const multer = require("multer");
const router = express.Router();
const clinicController = require("../controllers/ClinicController");
const { uploadFileMiddleware } = require("../utils/UploadFiles");
const clinicValidation = require("../validations/ClinicValidation");
const routerPath = require("./RouterPath");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

// Setup multer memory storage once
const upload = multer({ storage: multer.memoryStorage() });

// Setup common upload fields
const clinicUploadFields = upload.fields([
  { name: "clinic_logo", maxCount: 1 },
]);

// Setup common file middleware options
const clinicFileMiddleware = uploadFileMiddleware({
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

// Add Clinic
router.post(
  routerPath.ADD_CLINIC,
  authenticateTenantClinicGroup(["tenant"]),
  upload.any(),
  clinicFileMiddleware,
  clinicController.createClinic
);

// Get All Clinics by Tenant
router.get(
  routerPath.GETALL_CLINIC_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user"]),
  //  multiTenantAuthMiddleware,
  clinicController.getAllClinicByTenantId
);

// Get Clinic by Tenant & Clinic ID
router.get(
  routerPath.GET_CLINIC_TENANT,
  authenticateTenantClinicGroup(["tenant","super-user","dentist","receptionist","patient"]),
  clinicController.getClinicByTenantIdAndClinicId
);

// Update Clinic
router.put(
  routerPath.UPDATE_CLINIC_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user"]),
  // clinicUploadFields,
  upload.any(),
  clinicFileMiddleware,
  clinicController.updateClinic
);

// Update Clinic
router.put(
  routerPath.UPDATE_CLINIC_SETTINGS,
  authenticateTenantClinicGroup(["tenant","super-user"]),
  // clinicUploadFields,
  upload.any(),
  clinicFileMiddleware,
  clinicController.updateClinicSettings
);

router.put(
  routerPath.HANDLE_CLINIC_ASSIGNMENT,
  authenticateTenantClinicGroup(["tenant", "super-user"]),
  clinicController.handleClinicAssignment
);

// Delete Clinic
router.delete(
  routerPath.DELETE_CLINIC_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user"]),
  clinicController.deleteClinicByTenantIdAndClinicId
);

module.exports = router;
