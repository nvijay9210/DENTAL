const express = require("express");
const router = express.Router();
const tenantController = require("../controllers/TenantController");
const routerPath = require("./RouterPath");
const tenantValidation=require('../validations/TenantValidation')
const multer=require('multer');
const { uploadFileMiddleware } = require("../utils/UploadFiles");
const upload = multer({ storage: multer.memoryStorage() });

// Common upload fields
const TenantUploadFields = upload.fields([
  { name: "tenant_app_logo", maxCount: 1 }
]);

// File middleware options
const TenantFileMiddleware = uploadFileMiddleware({
    folderName: "Tenant",
    fileFields: [
      {
        fieldName: "tenant_app_logo",
        subFolder: "Photos",
        maxSizeMB: 2,
        multiple: false,
      }
    ],
    createValidationFn: tenantValidation.createTenantValidation,
    updateValidationFn: tenantValidation.updateTenantValidation,
  });

router.post(routerPath.ADD_TENANT,TenantUploadFields,TenantFileMiddleware, tenantController.addTenant);
router.get(routerPath.GETALL_TENTANT, tenantController.getAllTenant);
router.get(routerPath.GET_TENANT, tenantController.getTenantByTenantId);
router.put(routerPath.UPDATE_TENANT,TenantUploadFields,TenantFileMiddleware,  tenantController.updateTenant);
router.delete(routerPath.DELETE_TENANT, tenantController.deleteTenant);

module.exports = router;
