const express = require("express");
const router = express.Router();
const multer = require("multer");

const assetController = require("../controllers/AssetController");
const {
  ADD_ASSET,
  GETALL_ASSET_TENANT,
  GET_ASSET_TENANT,
  UPDATE_ASSET_TENANT,
  DELETE_ASSET_TENANT,
  GETALL_ASSET_REPORT_TENANT_CLINIC,
} = require("./RouterPath");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");
const assetvalidation = require("../validations/AssetValidation");
const { uploadFileMiddleware } = require("../utils/UploadFiles");
// Setup multer memory storage once
const upload = multer({ storage: multer.memoryStorage() });

const assetFileMiddleware = uploadFileMiddleware({
  folderName: "Asset",
  fileFields: [
    {
      fieldName: "asset_photo",
      maxSizeMB: 2,
      multiple: false,
    },
  ],
  createValidationFn: assetvalidation.createAssetValidation,
  updateValidationFn: assetvalidation.updateAssetValidation,
});

// Create Asset
router.post(
  ADD_ASSET,
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user"]),
  upload.any(),
  assetFileMiddleware,
  assetController.createAsset
);

// Get All Assets by Tenant ID with Pagination
router.get(
  GETALL_ASSET_TENANT,
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user"]),
  assetController.getAllAssetsByTenantId
);

router.get(
  GETALL_ASSET_REPORT_TENANT_CLINIC,
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user"]),
  assetController.getAllAssetsByTenantIdAndClinicIdAndStartDateAndEndDate
);

// Get Single Asset by Tenant ID & Asset ID
router.get(
  GET_ASSET_TENANT,
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user"]),
  assetController.getAssetByTenantIdAndAssetId
);

// Update Asset
router.put(
  UPDATE_ASSET_TENANT,
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user"]),
  upload.any(),
  assetFileMiddleware,
  assetController.updateAsset
);

// Delete Asset
router.delete(
  DELETE_ASSET_TENANT,
  authenticateTenantClinicGroup(["tenant", "dentist", "super-user"]),
  assetController.deleteAssetByTenantIdAndAssetId
);

module.exports = router;
