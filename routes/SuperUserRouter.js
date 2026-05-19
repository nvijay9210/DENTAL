const express = require("express");
const router = express.Router();
const multer = require("multer");
const { uploadFileMiddleware, uploadFileMiddleware2 } = require("../utils/UploadFiles");

const superuserController = require("../controllers/SuperUserController");
const {
  ADD_SUPERUSER,
  GETALL_SUPERUSER_TENANT,
  GET_SUPERUSER_TENANT,
  UPDATE_SUPERUSER_TENANT,
  DELETE_SUPERUSER_TENANT,
  GETALL_SUPERUSER_TENANT_CLINIC,
} = require("./RouterPath");

const superuserValidation = require("../validations/SuperUserValidation");
const { multiTenantAuthMiddleware } = require("../middlewares/AuthToken");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");
const upload = multer({ storage: multer.memoryStorage() });

// router.use(multiTenantAuthMiddleware)

const superuserFileMiddleware = uploadFileMiddleware2({
  folderName: "SuperUser",
  fileFields: [
    {
      fieldName: "profile_picture",
      subFolder: "Photos",
      maxSizeMB: 2,
      multiple: false,
    },
  ],
  createValidationFn: superuserValidation.createSuperUserValidation,
  updateValidationFn: superuserValidation.updateSuperUserValidation,
});

// Create SuperUser
router.post(
  ADD_SUPERUSER,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  upload.any(),
  superuserFileMiddleware,
  superuserController.createSuperUser
);

// Get All SuperUsers by Tenant ID with Pagination
router.get(
  GETALL_SUPERUSER_TENANT,
  // authenticateTenantClinicGroup([
  //   "tenant",
  // ]),
  superuserController.getAllSuperUsersByTenantId
);
router.get(
  GETALL_SUPERUSER_TENANT_CLINIC,
  authenticateTenantClinicGroup([
    "tenant",
  ]),
  superuserController.getAllSuperUsersByTenantIdAndClinicId
);

// Get Single SuperUser by Tenant ID & SuperUser ID
router.get(
  GET_SUPERUSER_TENANT,
  authenticateTenantClinicGroup(["tenant"]),
  superuserController.getSuperUserByTenantIdAndSuperUserId
);

// Update SuperUser
router.put(
  UPDATE_SUPERUSER_TENANT,
  authenticateTenantClinicGroup(["tenant"]),
  upload.any(),
  superuserFileMiddleware,
  superuserController.updateSuperUser
);

// Delete SuperUser
router.delete(
  DELETE_SUPERUSER_TENANT,
  authenticateTenantClinicGroup(["tenant"]),
  superuserController.deleteSuperUserByTenantIdAndSuperUserId
);

module.exports = router;
