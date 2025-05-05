const express = require("express");
const router = express.Router();

const prescriptionController = require("../controllers/PrescriptionController");
const {
  ADD_PRESCRIPTION,
  GETALL_PRESCRIPTION_TENANT,
  GET_PRESCRIPTION_TENANT,
  UPDATE_PRESCRIPTION_TENANT,
  DELETE_PRESCRIPTION_TENANT,
} = require("./RouterPath");

// Create Prescription
router.post(ADD_PRESCRIPTION, prescriptionController.createPrescription);

// Get All Prescriptions by Tenant ID with Pagination
router.get(
  GETALL_PRESCRIPTION_TENANT,
  prescriptionController.getAllPrescriptionsByTenantId
);

// Get Single Prescription by Tenant ID & Prescription ID
router.get(
  GET_PRESCRIPTION_TENANT,
  prescriptionController.getPrescriptionByTenantIdAndPrescriptionId
);

// Update Prescription
router.put(
  UPDATE_PRESCRIPTION_TENANT,
  prescriptionController.updatePrescription
);

// Delete Prescription
router.delete(
  DELETE_PRESCRIPTION_TENANT,
  prescriptionController.deletePrescriptionByTenantIdAndPrescriptionId
);

module.exports = router;
