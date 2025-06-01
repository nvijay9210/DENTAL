const express = require("express");
const router = express.Router();
const multer = require("multer");

const treatmentController = require("../controllers/TreatmentController");
const treatmentValidation = require("../validations/TreatmentValidation");

const { uploadFileMiddleware } = require("../utils/UploadFiles");
const {
  ADD_TREATMENT,
  GETALL_TREATMENT_TENANT,
  GET_TREATMENT_TENANT,
  UPDATE_TREATMENT_TENANT,
  DELETE_TREATMENT_TENANT,
  GETALL_TREATMENT_TENANT_CLIENT,
  GETALL_TREATMENT_TENANT_CLINIC_DENTIST,
  GETALL_TREATMENT_TENANT_CLIENT_APPOINTEMENT,
  GETALL_TREATMENT_TENANT_CLINIC_DENTIST_APPOINTEMENT,
} = require("./RouterPath");

const upload = multer({ storage: multer.memoryStorage() });

// File middleware options
const treatmentFileMiddleware = uploadFileMiddleware({
  folderName: "Treatment",
  fileFields: [
    {
      fieldName: "treatment_images",
      subFolder: "Photos",
      maxSizeMB: 10,
      multiple: true,
    },
  ],
  createValidationFn: treatmentValidation.createTreatmentValidation,
  updateValidationFn: treatmentValidation.updateTreatmentValidation,
});

// Create Treatment
router.post(
  ADD_TREATMENT,
 upload.any(),
  treatmentFileMiddleware,
  treatmentController.createTreatment
);

// Get All Treatments by Tenant ID with Pagination
router.get(
  GETALL_TREATMENT_TENANT,
  treatmentController.getAllTreatmentsByTenantId
);

router.get(
  GETALL_TREATMENT_TENANT_CLIENT_APPOINTEMENT,
  treatmentController.getAllTreatmentsByTenantAndClinicId
);

router.get(
  GETALL_TREATMENT_TENANT_CLINIC_DENTIST_APPOINTEMENT,
  treatmentController.getAllTreatmentsByTenantAndClinicIdAndDentist
);

// Get Single Treatment by Tenant ID & Treatment ID
router.get(
  GET_TREATMENT_TENANT,
  treatmentController.getTreatmentByTenantIdAndTreatmentId
);

// Update Treatment
router.put(
  UPDATE_TREATMENT_TENANT,
  upload.any(),
  treatmentFileMiddleware,
  treatmentController.updateTreatment
);

// Delete Treatment
router.delete(
  DELETE_TREATMENT_TENANT,
  treatmentController.deleteTreatmentByTenantIdAndTreatmentId
);

module.exports = router;
