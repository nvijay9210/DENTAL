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
  GETALL_TREATMENT_FOLLOWUP_NOTIFY_DENTIST,
  GETALL_TREATMENT_FOLLOWUP_NOTIFY,
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
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist"]),
  upload.any(),
  treatmentFileMiddleware,
  treatmentController.createTreatment
);

// Get All Treatments by Tenant ID with Pagination
router.get(
  GETALL_TREATMENT_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist","receptionist", "patient"]),
  treatmentController.getAllTreatmentsByTenantId
);

router.get(
  GETALL_TREATMENT_TENANT_CLIENT_APPOINTEMENT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist","receptionist", "patient"]),
  treatmentController.getAllTreatmentsByTenantAndClinicId
);

router.get(
  GETALL_TREATMENT_TENANT_CLINIC_DENTIST_APPOINTEMENT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist","receptionist", "patient"]),
  treatmentController.getAllTreatmentsByTenantAndClinicIdAndDentist
);
router.get(
  GETALL_TREATMENT_TENANT_DENTIST,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist","receptionist", "patient"]),
  treatmentController.getAllTreatmentsByTenantAndDentistId
);

router.get(
  GETALL_TREATMENT_TENANT_PATIENT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist","receptionist", "patient"]),
  treatmentController.getAllTreatmentsByTenantAndPatientId
);

router.get(
  GETALL_TREATMENT_FOLLOWUP_NOTIFY,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist","receptionist", "patient"]),
  treatmentController.getTodayFollowUps
);

// Get Single Treatment by Tenant ID & Treatment ID
router.get(
  GET_TREATMENT_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist","receptionist", "patient"]),
  treatmentController.getTreatmentByTenantIdAndTreatmentId
);

// Update Treatment
router.put(
  UPDATE_TREATMENT_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist","receptionist", "patient"]),
  upload.any(),
  treatmentFileMiddleware,
  treatmentController.updateTreatment
);

// Delete Treatment
router.delete(
  DELETE_TREATMENT_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist","receptionist", "patient"]),
  treatmentController.deleteTreatmentByTenantIdAndTreatmentId
);

module.exports = router;
