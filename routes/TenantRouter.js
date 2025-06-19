const express = require("express");
const router = express.Router();
const tenantController = require("../controllers/TenantController");
const routerPath = require("./RouterPath");
const tenantValidation = require("../validations/TenantValidation");
const multer = require("multer");
const { uploadFileMiddleware } = require("../utils/UploadFiles");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");
const upload = multer({ storage: multer.memoryStorage() });

// router.use(multiTenantAuthMiddleware);

// Common upload fields

// File middleware options
const TenantFileMiddleware = uploadFileMiddleware({
  folderName: "Tenant",
  fileFields: [
    {
      fieldName: "tenant_app_logo",
      subFolder: "Photos",
      maxSizeMB: 2,
      multiple: false,
    },
  ],
  createValidationFn: tenantValidation.createTenantValidation,
  updateValidationFn: tenantValidation.updateTenantValidation,
});

router.post(
  routerPath.ADD_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user"]),
  upload.any(),
  TenantFileMiddleware,
  tenantController.addTenant
);
router.get(
  routerPath.GETALL_TENTANT,
  authenticateTenantClinicGroup(["tenant", "super-user"]),
  tenantController.getAllTenant
);
router.get(
  routerPath.GET_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user"]),
  tenantController.getTenantByTenantId
);
router.get(
  routerPath.GET_TENANT_NAME_DOMAIN,
  authenticateTenantClinicGroup(["tenant", "super-user","dentist","patient","receptionist","supplier"]),
  tenantController.getTenantByTenantNameAndTenantDomain
);
router.put(
  routerPath.UPDATE_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user"]),
  upload.any(),
  TenantFileMiddleware,
  tenantController.updateTenant
);
router.delete(
  routerPath.DELETE_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user"]),
  tenantController.deleteTenant
);

module.exports = router;
