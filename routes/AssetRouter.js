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
} = require("./RouterPath");
const assetvalidation = require("../validations/AssetValidation");
const { uploadFileMiddleware } = require("../utils/UploadFiles");
// Setup multer memory storage once
const upload = multer({ storage: multer.memoryStorage() });

const assetFileMiddleware = uploadFileMiddleware({
  folderName: "Asset",
  fileFields: [
    {
      fieldName: "asset_photo",
      subFolder: "Photos",
      maxSizeMB: 1,
      multiple: false,
    },
  ],
  createValidationFn: assetvalidation.createAssetValidation,
  updateValidationFn: assetvalidation.updateAssetValidation,
});

// Create Asset
router.post(
  ADD_ASSET,
  upload.any(),
  assetFileMiddleware,
  assetController.createAsset
);

// Get All Assets by Tenant ID with Pagination
router.get(GETALL_ASSET_TENANT, assetController.getAllAssetsByTenantId);

// Get Single Asset by Tenant ID & Asset ID
router.get(GET_ASSET_TENANT, assetController.getAssetByTenantIdAndAssetId);

// Update Asset
router.put(
  UPDATE_ASSET_TENANT,
  upload.any(),
  assetFileMiddleware,
  assetController.updateAsset
);

// Delete Asset
router.delete(
  DELETE_ASSET_TENANT,
  assetController.deleteAssetByTenantIdAndAssetId
);

module.exports = router;
