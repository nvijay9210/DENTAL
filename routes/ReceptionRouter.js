const express = require("express");
const router = express.Router();
const multer = require("multer");
const { uploadFileMiddleware, uploadFileMiddleware2 } = require("../utils/UploadFiles");

const receptionController = require("../controllers/ReceptionController");
const {
  ADD_RECEPTION,
  GETALL_RECEPTION_TENANT,
  GET_RECEPTION_TENANT,
  UPDATE_RECEPTION_TENANT,
  DELETE_RECEPTION_TENANT,
  GETALL_RECEPTION_TENANT_CLINIC,
} = require("./RouterPath");

const receptionValidation = require("../validations/ReceptionValidation");
const { multiTenantAuthMiddleware } = require("../middlewares/AuthToken");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");
const globalInvalidationMiddleware = require("../middlewares/GlobalInvalidationMiddleware");
const { globalCacheMiddleware } = require("../middlewares/GlobalCacheMiddleware");
const upload = multer({ storage: multer.memoryStorage() });

// router.use(multiTenantAuthMiddleware)

const receptionFileMiddleware = uploadFileMiddleware2({
  folderName: "Reception",
  fileFields: [
    {
      fieldName: "profile_picture",
      subFolder: "Photos",
      maxSizeMB: 2,
      multiple: false,
    },
  ],
  createValidationFn: receptionValidation.createReceptionValidation,
  updateValidationFn: receptionValidation.updateReceptionValidation,
});

// Create Reception
router.post(
  ADD_RECEPTION,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  upload.any(),
  receptionFileMiddleware,
  globalInvalidationMiddleware,
  receptionController.createReception
);

// Get All Receptions by Tenant ID with Pagination
router.get(
  GETALL_RECEPTION_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "patient",
    "receptionist",
  ]),
  globalCacheMiddleware,
  receptionController.getAllReceptionsByTenantId
);
router.get(
  GETALL_RECEPTION_TENANT_CLINIC,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "patient",
    "receptionist",
  ]),
  globalCacheMiddleware,
  receptionController.getAllReceptionsByTenantIdAndClinicId
);

// Get Single Reception by Tenant ID & Reception ID
router.get(
  GET_RECEPTION_TENANT,
  authenticateTenantClinicGroup(["tenant", "superuser", "dentist", "patient","receptionist"]),
   globalCacheMiddleware,
  receptionController.getReceptionByTenantIdAndReceptionId
);

// Update Reception
router.put(
  UPDATE_RECEPTION_TENANT,
  authenticateTenantClinicGroup(["tenant", "superuser", "dentist", "patient","receptionist"]),
  upload.any(),
  receptionFileMiddleware,
  globalInvalidationMiddleware,
  receptionController.updateReception
);

// Delete Reception
router.delete(
  DELETE_RECEPTION_TENANT,
  authenticateTenantClinicGroup(["tenant", "superuser", "dentist", "patient","receptionist"]),globalInvalidationMiddleware,
  receptionController.deleteReceptionByTenantIdAndReceptionId
);

module.exports = router;
