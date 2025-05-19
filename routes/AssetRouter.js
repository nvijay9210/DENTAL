const express = require("express");
const router = express.Router();

const assetController = require("../controllers/AssetController");
const {
  ADD_ASSET,
  GETALL_ASSET_TENANT,
  GET_ASSET_TENANT,
  UPDATE_ASSET_TENANT,
  DELETE_ASSET_TENANT,
} = require("./RouterPath");

// Create Asset
router.post(ADD_ASSET, assetController.createAsset);

// Get All Assets by Tenant ID with Pagination
router.get(
  GETALL_ASSET_TENANT,
  assetController.getAllAssetsByTenantId
);


// Get Single Asset by Tenant ID & Asset ID
router.get(
  GET_ASSET_TENANT,
  assetController.getAssetByTenantIdAndAssetId
);

// Update Asset
router.put(
  UPDATE_ASSET_TENANT,
  assetController.updateAsset
);

// Delete Asset
router.delete(
  DELETE_ASSET_TENANT,
  assetController.deleteAssetByTenantIdAndAssetId
);

module.exports = router;
