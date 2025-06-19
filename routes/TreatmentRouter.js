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
  GETALL_TREATMENT_TENANT_DENTIST,
  GETALL_TREATMENT_TENANT_PATIENT,
} = require("./RouterPath");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

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
  authenticateTenantClinicGroup(["tenant", "super-user","dentist"]),
  upload.any(),
  treatmentFileMiddleware,
  treatmentController.createTreatment
);

// Get All Treatments by Tenant ID with Pagination
router.get(
  GETALL_TREATMENT_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist", "patient"]),
  treatmentController.getAllTreatmentsByTenantId
);

router.get(
  GETALL_TREATMENT_TENANT_CLIENT_APPOINTEMENT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist", "patient"]),
  treatmentController.getAllTreatmentsByTenantAndClinicId
);

router.get(
  GETALL_TREATMENT_TENANT_CLINIC_DENTIST_APPOINTEMENT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist", "patient"]),
  treatmentController.getAllTreatmentsByTenantAndClinicIdAndDentist
);
router.get(
  GETALL_TREATMENT_TENANT_DENTIST,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist", "patient"]),
  treatmentController.getAllTreatmentsByTenantAndDentistId
);
router.get(
  GETALL_TREATMENT_TENANT_PATIENT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist", "patient"]),
  treatmentController.getAllTreatmentsByTenantAndPatientId
);

// Get Single Treatment by Tenant ID & Treatment ID
router.get(
  GET_TREATMENT_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist", "patient"]),
  treatmentController.getTreatmentByTenantIdAndTreatmentId
);

// Update Treatment
router.put(
  UPDATE_TREATMENT_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist", "patient"]),
  upload.any(),
  treatmentFileMiddleware,
  treatmentController.updateTreatment
);

// Delete Treatment
router.delete(
  DELETE_TREATMENT_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist", "patient"]),
  treatmentController.deleteTreatmentByTenantIdAndTreatmentId
);

module.exports = router;
