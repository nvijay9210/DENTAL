const express = require("express");
const router = express.Router();

const referenceController = require("../controllers/ReferenceController");
const {
  ADD_REFERENCE
} = require("./RouterPath");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");
const { uploadFileMiddleware2 } = require("../utils/UploadFiles");
const referenceValidation = require("../validations/ReferenceValidation");
const multer = require("multer");

const ReferenceFileMiddleware = uploadFileMiddleware2({
  folderName: "ReferenceImage",
  fileFields: [
    {
      fieldName: "reference_image",
      maxSizeMB: 2,
      multiple: false,
    }
  ],
  createValidationFn: referenceValidation.createReferenceValidation,
  updateValidationFn: referenceValidation.updateReferenceValidation,
});
const upload = multer({ storage: multer.memoryStorage() });

// Create Reference
router.post(
  ADD_REFERENCE,
  authenticateTenantClinicGroup(["tenant", "dentist","receptionist", "superuser","patient"]),
  upload.any(),
  ReferenceFileMiddleware,
  referenceController.createReference
);

// // Get All References by Tenant ID with Pagination
// router.get(
//   GETALL_REFERENCE_TENANT,
//   authenticateTenantClinicGroup(["tenant", "dentist","receptionist", "superuser","patient"]),
//   referenceController.getAllReferencesByTenantId
// );
// router.get(
//   GETALL_REFERENCE_TENANT_CLINIC_DENTIST_PATIENT,
//   authenticateTenantClinicGroup(["tenant", "dentist","receptionist", "superuser","patient"]),
//   referenceController.getAllReferenceByTenantAndClinicAndDentistAndPatientId
// );
// router.get(
//   GETALL_REFERENCE_TENANT_CLINIC_PATIENT,
//   authenticateTenantClinicGroup(["tenant", "dentist","receptionist", "superuser","patient"]),
//   referenceController.getAllReferenceByTenantAndClinicAndPatientId
// );

// // Get Single Reference by Tenant ID & Reference ID
// router.get(
//   GET_REFERENCE_TENANT,
//   authenticateTenantClinicGroup(["tenant", "dentist","receptionist", "superuser","patient"]),
//   referenceController.getReferenceByTenantIdAndReferenceId
// );

// // Update Reference
// router.put(
//   UPDATE_REFERENCE_TENANT,
//   authenticateTenantClinicGroup(["tenant", "dentist","receptionist", "superuser","patient"]),
//   referenceController.updateReference
// );

// // Delete Reference
// router.delete(
//   DELETE_REFERENCE_TENANT,
//   authenticateTenantClinicGroup(["tenant", "dentist","receptionist", "superuser","patient"]),
//   referenceController.deleteReferenceByTenantIdAndReferenceId
// );

module.exports = router;
