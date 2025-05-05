const express = require("express");
const multer = require("multer");
const router = express.Router();
const dentistController = require("../controllers/DentistController");
const validate = require("../middlewares/validate");
const routerPath = require("./RouterPath");
const { UploadDentistPhoto } = require("../utils/UploadDentistPhoto");

// Setup multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Setup upload fields
const dentistUploadFields = upload.fields([
  { name: "profile_picture", maxCount: 1 },
  { name: "awards_certifications" }, // allow multiple
]);

// Add Dentist
router.post(
  routerPath.ADD_DENTIST,
  dentistUploadFields,
  UploadDentistPhoto,
  dentistController.createDentist
);

// Get All Dentists by Tenant ID
router.get(
  routerPath.GETALL_DENTIST_TENANT,
  dentistController.getAllDentistsByTenantId
);

// Get Dentist by Clinic ID and Dentist ID
router.get(
  routerPath.GET_DENTIST_TENANT,
  dentistController.getDentistByTenantIdAndDentistId
);

// Update Dentist
router.put(
  routerPath.UPDATE_DENTIST_TENANT,
  dentistUploadFields,
  UploadDentistPhoto,
  dentistController.updateDentist
);

// Delete Dentist
router.delete(
  routerPath.DELETE_DENTIST_TENANT,
  dentistController.deleteDentistByTenantIdAndDentistId
);

module.exports = router;
