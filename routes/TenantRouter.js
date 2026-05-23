const express = require("express");
const router = express.Router();
const tenantController = require("../controllers/TenantController");
const routerPath = require("./RouterPath");
const tenantValidation = require("../validations/TenantValidation");
const multer = require("multer");
const { uploadFileMiddleware, uploadFileMiddleware2 } = require("../utils/UploadFiles");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");
const { globalCacheMiddleware } = require("../middlewares/GlobalCacheMiddleware");
const globalInvalidationMiddleware = require("../middlewares/GlobalInvalidationMiddleware");
const upload = multer({ storage: multer.memoryStorage() });

// router.use(multiTenantAuthMiddleware);

// Common upload fields

// File middleware options
const TenantFileMiddleware = uploadFileMiddleware2({
  folderName: "Tenant",
  fileFields: [
    {
      fieldName: "tenant_app_logo",
      maxSizeMB: 2,
      multiple: false,
    },
  ],
  createValidationFn: tenantValidation.createTenantValidation,
  updateValidationFn: tenantValidation.updateTenantValidation,
});

router.post(
  routerPath.ADD_TENANT,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  upload.any(),
  TenantFileMiddleware,
  globalInvalidationMiddleware,
  tenantController.addTenant
);
router.get(
  routerPath.GETALL_TENTANT,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  globalCacheMiddleware,
  tenantController.getAllTenant
);
router.get(
  routerPath.GET_TENANT,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  globalCacheMiddleware,
  tenantController.getTenantByTenantId
);
router.get(
  routerPath.GET_TENANT_NAME_DOMAIN,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "patient",
    "receptionist",
    "supplier",
    "guest"
  ]),
  globalCacheMiddleware,
  tenantController.getTenantByTenantNameAndTenantDomain
);
router.put(
  routerPath.UPDATE_TENANT,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  upload.any(),
  TenantFileMiddleware,
  globalInvalidationMiddleware,
  tenantController.updateTenant
);
router.delete(
  routerPath.DELETE_TENANT,
  globalInvalidationMiddleware,
  authenticateTenantClinicGroup(["tenant", "superuser"]),
  tenantController.deleteTenant
);

module.exports = router;
