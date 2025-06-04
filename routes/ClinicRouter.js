const express = require("express");
const multer = require("multer");
const router = express.Router();
const clinicController = require("../controllers/ClinicController");
const { uploadFileMiddleware } = require("../utils/UploadFiles");
const clinicValidation = require("../validations/ClinicValidation");
const routerPath = require("./RouterPath");
const { multiTenantAuthMiddleware } = require("../middlewares/AuthToken");

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
      subFolder: "Photos",
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
  // clinicUploadFields,
  upload.any(),
  clinicFileMiddleware,
  clinicController.createClinic
);

// Get All Clinics by Tenant
router.get(
  routerPath.GETALL_CLINIC_TENANT,
  //  multiTenantAuthMiddleware,
  clinicController.getAllClinicByTenantId
);

// Get Clinic by Tenant & Clinic ID
router.get(
  routerPath.GET_CLINIC_TENANT,
  clinicController.getClinicByTenantIdAndClinicId
);

// Update Clinic
router.put(
  routerPath.UPDATE_CLINIC_TENANT,
  // clinicUploadFields,
  upload.any(),
  clinicFileMiddleware,
  clinicController.updateClinic
);

router.put(
  routerPath.HANDLE_CLINIC_ASSIGNMENT,
  clinicController.handleClinicAssignment
);

// Delete Clinic
router.delete(
  routerPath.DELETE_CLINIC_TENANT,
  clinicController.deleteClinicByTenantIdAndClinicId
);

module.exports = router;
