const express = require("express");
const multer = require("multer");
const router = express.Router();
const patientController = require("../controllers/PatientController");

const { uploadFileMiddleware } = require("../utils/UploadFiles");
const patientValidation = require("../validations/PatientValidation");
const routerPath = require("./RouterPath");

// Setup multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Common upload fields
const patientUploadFields = upload.fields([
  { name: "profile_picture", maxCount: 1 },
  // { name: "aadhaar_front", maxCount: 1 },
  // { name: "aadhaar_back", maxCount: 1 },
  // { name: "medical_reports", maxCount: 10 },
]);

// File middleware options
const patientFileMiddleware = uploadFileMiddleware({
  folderName: "Patient",
  fileFields: [
    {
      fieldName: "profile_picture",
      subFolder: "Photos",
      maxSizeMB: 2,
      multiple: false,
    },
    // { fieldName: "aadhaar_front", subFolder: "Documents", maxSizeMB: 5, multiple: false },
    // { fieldName: "aadhaar_back", subFolder: "Documents", maxSizeMB: 5, multiple: false },
    // { fieldName: "medical_reports", subFolder: "Documents", maxSizeMB: 5, multiple: true },
  ],
  createValidationFn: patientValidation.createPatientValidation,
  updateValidationFn: patientValidation.updatePatientValidation,
});

// Create Patient
router.post(
  routerPath.ADD_PATIENT,
  patientUploadFields,
  patientFileMiddleware,
  patientController.createPatient
);

// Get All Patients
router.get(
  routerPath.GETALL_PATIENT_TENANT,
  patientController.getAllPatientsByTenantId
);

// Get Single Patient
router.get(
  routerPath.GET_PATIENT_TENANT,
  patientController.getPatientByTenantIdAndPatientId
);

// Update Patient
router.put(
  routerPath.UPDATE_PATIENT_TENANT,
  patientUploadFields,
  patientFileMiddleware,
  patientController.updatePatient
);

// Delete Patient
router.delete(
  routerPath.DELETE_PATIENT_TENANT,
  patientController.deletePatientByTenantIdAndPatientId
);

module.exports = router;
