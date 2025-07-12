const express = require("express");
const router = express.Router();

const toothdetailsController = require("../controllers/ToothDetailsController");
const {
  ADD_TOOTHDETAILS,
  GETALL_TOOTHDETAILS_TENANT,
  GET_TOOTHDETAILS_TENANT,
  UPDATE_TOOTHDETAILS_TENANT,
  DELETE_TOOTHDETAILS_TENANT,
  GETALL_TOOTHDETAILS_TENANT_CLINIC_DENTIST_PATIENT,
  GETALL_TOOTHDETAILS_TENANT_CLINIC_PATIENT,
} = require("./RouterPath");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

// Create ToothDetails
router.post(
  ADD_TOOTHDETAILS,
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user","patient"]),
  toothdetailsController.createToothDetails
);

// Get All ToothDetailss by Tenant ID with Pagination
router.get(
  GETALL_TOOTHDETAILS_TENANT,
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user","patient"]),
  toothdetailsController.getAllToothDetailssByTenantId
);
router.get(
  GETALL_TOOTHDETAILS_TENANT_CLINIC_DENTIST_PATIENT,
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user","patient"]),
  toothdetailsController.getAllToothDetailsByTenantAndClinicAndDentistAndPatientId
);
router.get(
  GETALL_TOOTHDETAILS_TENANT_CLINIC_PATIENT,
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user","patient"]),
  toothdetailsController.getAllToothDetailsByTenantAndClinicAndPatientId
);

// Get Single ToothDetails by Tenant ID & ToothDetails ID
router.get(
  GET_TOOTHDETAILS_TENANT,
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user","patient"]),
  toothdetailsController.getToothDetailsByTenantIdAndToothDetailsId
);

// Update ToothDetails
router.put(
  UPDATE_TOOTHDETAILS_TENANT,
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user","patient"]),
  toothdetailsController.updateToothDetails
);

// Delete ToothDetails
router.delete(
  DELETE_TOOTHDETAILS_TENANT,
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user","patient"]),
  toothdetailsController.deleteToothDetailsByTenantIdAndToothDetailsId
);

module.exports = router;
