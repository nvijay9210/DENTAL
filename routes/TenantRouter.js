const express = require("express");
const router = express.Router();
const tenantController = require("../controllers/TenantController");
const routerPath = require("./RouterPath");
const tenantValidation = require("../validations/TenantValidation");
const multer = require("multer");
const { uploadFileMiddleware } = require("../utils/UploadFiles");
const {
  multiTenantAuthMiddleware,
  permit,
} = require("../middlewares/AuthToken");
const { accessTokenValidMiddleware } = require("../middlewares/TokenValidaton");
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
  upload.any(),
  TenantFileMiddleware,
  tenantController.addTenant
);
router.get(routerPath.GETALL_TENTANT, tenantController.getAllTenant);
router.get(routerPath.GET_TENANT, tenantController.getTenantByTenantId);
router.get(
  routerPath.GET_TENANT_NAME_DOMAIN,
  accessTokenValidMiddleware,
  tenantController.getTenantByTenantNameAndTenantDomain
);
router.put(
  routerPath.UPDATE_TENANT,
  upload.any(),
  TenantFileMiddleware,
  tenantController.updateTenant
);
router.delete(routerPath.DELETE_TENANT, tenantController.deleteTenant);

module.exports = router;
