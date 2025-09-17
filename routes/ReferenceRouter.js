const express = require("express");
const router = express.Router();

const referenceController = require("../controllers/ReferenceController");
const {
  ADD_REFERENCE
} = require("./RouterPath");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

// Create Reference
router.post(
  ADD_REFERENCE,
  authenticateTenantClinicGroup(["tenant", "dentist","receptionist", "super-user","patient"]),
  referenceController.createReference
);

// // Get All References by Tenant ID with Pagination
// router.get(
//   GETALL_REFERENCE_TENANT,
//   authenticateTenantClinicGroup(["tenant", "dentist","receptionist", "super-user","patient"]),
//   referenceController.getAllReferencesByTenantId
// );
// router.get(
//   GETALL_REFERENCE_TENANT_CLINIC_DENTIST_PATIENT,
//   authenticateTenantClinicGroup(["tenant", "dentist","receptionist", "super-user","patient"]),
//   referenceController.getAllReferenceByTenantAndClinicAndDentistAndPatientId
// );
// router.get(
//   GETALL_REFERENCE_TENANT_CLINIC_PATIENT,
//   authenticateTenantClinicGroup(["tenant", "dentist","receptionist", "super-user","patient"]),
//   referenceController.getAllReferenceByTenantAndClinicAndPatientId
// );

// // Get Single Reference by Tenant ID & Reference ID
// router.get(
//   GET_REFERENCE_TENANT,
//   authenticateTenantClinicGroup(["tenant", "dentist","receptionist", "super-user","patient"]),
//   referenceController.getReferenceByTenantIdAndReferenceId
// );

// // Update Reference
// router.put(
//   UPDATE_REFERENCE_TENANT,
//   authenticateTenantClinicGroup(["tenant", "dentist","receptionist", "super-user","patient"]),
//   referenceController.updateReference
// );

// // Delete Reference
// router.delete(
//   DELETE_REFERENCE_TENANT,
//   authenticateTenantClinicGroup(["tenant", "dentist","receptionist", "super-user","patient"]),
//   referenceController.deleteReferenceByTenantIdAndReferenceId
// );

module.exports = router;
