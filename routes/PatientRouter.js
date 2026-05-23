const express = require("express");
const multer = require("multer");
const router = express.Router();
const patientController = require("../controllers/PatientController");

const { uploadFileMiddleware, uploadFileMiddleware2 } = require("../utils/UploadFiles");
const patientValidation = require("../validations/PatientValidation");
const routerPath = require("./RouterPath");
const { multiTenantAuthMiddleware } = require("../middlewares/AuthToken");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");
const globalInvalidationMiddleware = require("../middlewares/GlobalInvalidationMiddleware");
const { globalCacheMiddleware } = require("../middlewares/GlobalCacheMiddleware");

// router.use(multiTenantAuthMiddleware)

// Setup multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Common upload fields
// const patientUploadFields = upload.fields([
//   { name: "profile_picture", maxCount: 1 },
//   // { name: "aadhaar_front", maxCount: 1 },
//   // { name: "aadhaar_back", maxCount: 1 },
//   // { name: "medical_reports", maxCount: 10 },
// ]);

// File middleware options
const patientFileMiddleware = uploadFileMiddleware2({
  folderName: "Patient",
  fileFields: [
    {
      fieldName: "profile_picture",
      maxSizeMB: 2,
      multiple: false,
    }
  ],
  createValidationFn: patientValidation.createPatientValidation,
  updateValidationFn: patientValidation.updatePatientValidation,
});

// Create Patient
router.post(
  routerPath.ADD_PATIENT,
  authenticateTenantClinicGroup(["tenant","superuser","dentist","guest"]),
  upload.any(),
  patientFileMiddleware,
  globalInvalidationMiddleware,
  patientController.createPatient
);

// Get All Patients
router.get(
  routerPath.GETALL_PATIENT_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "receptionist"
  ]),
  globalCacheMiddleware,
  patientController.getAllPatientsByTenantId
);
//getallpatient by tenant and clinic id without pagination
router.get(
  routerPath.GETALL_PATIENT_TENANT_CLINIC,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "receptionist"
  ]),
  globalCacheMiddleware,
  patientController.getAllPatientsByTenantIdAndClinicId
);
router.get(
  routerPath.GETALL_PATIENT_TENANT_CLINIC_DENTIST,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "receptionist"
  ]),
  globalCacheMiddleware,
  patientController.getAllPatientsByTenantIdAndClinicIdUsingAppointmentStatus
);

// Get Single Patient
router.get(
  routerPath.GET_PATIENT_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "receptionist",
    "patient"
  ]),
  globalCacheMiddleware,
  patientController.getPatientByTenantIdAndPatientId
);

// Update Patient
router.put(
  routerPath.UPDATE_PATIENT_TENANT,
  authenticateTenantClinicGroup(["tenant", "superuser", "dentist", "patient"]),
  // patientUploadFields,
  upload.any(),
  patientFileMiddleware,
  globalInvalidationMiddleware,
  patientController.updatePatient
);

// Delete Patient
router.delete(
  routerPath.DELETE_PATIENT_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "receptionist",
  ]),
  globalInvalidationMiddleware,
  patientController.deletePatientByTenantIdAndPatientId
);

module.exports = router;
