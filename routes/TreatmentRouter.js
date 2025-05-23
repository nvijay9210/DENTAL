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
} = require("./RouterPath");

const upload = multer({ storage: multer.memoryStorage() });

const treatmentUploadFields = upload.fields([
  { name: "treatment_images", maxCount: 1 },
]);

// File middleware options
const treatmentFileMiddleware = uploadFileMiddleware({
  folderName: "Treatment",
  fileFields: [
    {
      fieldName: "treatment_images",
      subFolder: "Photos",
      maxSizeMB: 2,
      multiple: false,
    },
  ],
  createValidationFn: treatmentValidation.createTreatmentValidation,
  updateValidationFn: treatmentValidation.updateTreatmentValidation,
});

// Create Treatment
router.post(
  ADD_TREATMENT,
  treatmentUploadFields,
  treatmentFileMiddleware,
  treatmentController.createTreatment
);

// Get All Treatments by Tenant ID with Pagination
router.get(
  GETALL_TREATMENT_TENANT,
  treatmentController.getAllTreatmentsByTenantId
);

// Get Single Treatment by Tenant ID & Treatment ID
router.get(
  GET_TREATMENT_TENANT,
  treatmentController.getTreatmentByTenantIdAndTreatmentId
);

// Update Treatment
router.put(
  UPDATE_TREATMENT_TENANT,
  treatmentUploadFields,
  treatmentFileMiddleware,
  treatmentController.updateTreatment
);

// Delete Treatment
router.delete(
  DELETE_TREATMENT_TENANT,
  treatmentController.deleteTreatmentByTenantIdAndTreatmentId
);

module.exports = router;
