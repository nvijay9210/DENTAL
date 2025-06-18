const express = require("express");
const router = express.Router();
const multer = require("multer");
const { uploadFileMiddleware } = require("../utils/UploadFiles");

const receptionController = require("../controllers/ReceptionController");
const {
  ADD_RECEPTION,
  GETALL_RECEPTION_TENANT,
  GET_RECEPTION_TENANT,
  UPDATE_RECEPTION_TENANT,
  DELETE_RECEPTION_TENANT,
} = require("./RouterPath");
const receptionValidation = require("../validations/ReceptionValidation");
const { multiTenantAuthMiddleware } = require("../middlewares/AuthToken");
const { authenticateTenantClinicGroup } = require("../Keycloak/AuthenticateTenantAndClient");
const upload = multer({ storage: multer.memoryStorage() });

// router.use(multiTenantAuthMiddleware)

const receptionFileMiddleware = uploadFileMiddleware({
    folderName: "Reception",
    fileFields: [
      {
        fieldName: "profile_picture",
        subFolder: "Photos",
        maxSizeMB: 2,
        multiple: false,
      }
    ],
    createValidationFn: receptionValidation.createReceptionValidation,
    updateValidationFn: receptionValidation.updateReceptionValidation,
  });

// Create Reception
router.post(
  ADD_RECEPTION,
  // authenticateTenantClinicGroup(['super-user']),
  upload.any(),
  receptionFileMiddleware,
  receptionController.createReception
);

// Get All Receptions by Tenant ID with Pagination
router.get(GETALL_RECEPTION_TENANT, receptionController.getAllReceptionsByTenantId);

// Get Single Reception by Tenant ID & Reception ID
router.get(GET_RECEPTION_TENANT, receptionController.getReceptionByTenantIdAndReceptionId);

// Update Reception
router.put(
  UPDATE_RECEPTION_TENANT,
  upload.any(),
  receptionFileMiddleware,
  receptionController.updateReception
);

// Delete Reception
router.delete(
  DELETE_RECEPTION_TENANT,
  receptionController.deleteReceptionByTenantIdAndReceptionId
);

module.exports = router;
