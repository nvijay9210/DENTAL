const { CustomError } = require("../middlewares/CustomeError");
const assetModel = require("../models/AssetModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const {
  formatDateOnly,
} = require("../utils/DateUtils");

// Field mapping for assets (similar to treatment)

// Create Asset
const createAsset = async (data) => {
  const fieldMap = {
    tenant_id: (val) => val,
    clinic_id: (val) => val,
    asset_name:(val)=>val,
    asset_type:(val)=>val,
    asset_status:(val)=>val,
    asset_photo:(val)=>val,
    allocated_to:(val)=>val,
    quantity:(val)=>val,
    price:(val)=>val,
    purchased_date:(val)=>val,
    purchased_by:(val)=>val,
    expired_date: (val) => val ,
    invoice_number: (val) => val ,
    description: helper.safeStringify ,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const assetId = await assetModel.createAsset(
      "asset",
      columns,
      values
    );
    await invalidateCacheByPattern("asset:*");
    return assetId;
  } catch (error) {
    console.error("Failed to create asset:", error);
    throw new CustomError(
      `Failed to create asset: ${error.message}`,
      404
    );
  }
};

// Get All Assets by Tenant ID with Caching
const getAllAssetsByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `asset:${tenantId}:page:${page}:limit:${limit}`;

  const jsonFields = ["description"];

  try {
    const assets = await getOrSetCache(cacheKey, async () => {
      const result = await assetModel.getAllAssetsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    if (assets && assets.length > 0) {
      assets.forEach((asset) => {
      
        // Handling date_of_birth field conversion
        if (asset.purchased_date) {
          asset.purchased_date = formatDateOnly(asset.purchased_date);
        }
        if (asset.expired_date) {
          asset.expired_date = formatDateOnly(asset.expired_date);
        }
      });
    }

    return helper.decodeJsonFields(assets, jsonFields);
  } catch (err) {
    console.error("Database error while fetching assets:", err);
    throw new CustomError("Failed to fetch assets", 404);
  }
};

// Get Asset by ID & Tenant
const getAssetByTenantIdAndAssetId = async (
  tenantId,
  assetId
) => {
  try {
    const asset =
      await assetModel.getAssetByTenantIdAndAssetId(
        tenantId,
        assetId
      );
      const jsonFields = ["description"];
      if (asset.purchased_date) {
        asset.purchased_date = formatDateOnly(asset.purchased_date);
      }
      if (asset.expired_date) {
        asset.expired_date = formatDateOnly(asset.expired_date);
      }
      return helper.decodeJsonFields(asset, jsonFields);
  } catch (error) {
    throw new CustomError("Failed to get asset: " + error.message, 404);
  }
};

// Update Asset
const updateAsset = async (assetId, data, tenant_id) => {
    const fieldMap = {
        tenant_id: (val) => val,
        clinic_id: (val) => val,
        asset_name:(val)=>val,
        asset_type:(val)=>val,
        asset_status:(val)=>val,
        asset_photo:(val)=>val,
        allocated_to:(val)=>val,
        quantity:(val)=>val,
        price:(val)=>val,
        purchased_date:(val)=>val,
        purchased_by:(val)=>val,
        expired_date: (val) => val ,
        invoice_number: (val) => val ,
        description: helper.safeStringify ,
        updated_by: (val) => val,
      };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    
    const affectedRows = await assetModel.updateAsset(
      assetId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Asset not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("asset:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update asset", 404);
  }
};

// Delete Asset
const deleteAssetByTenantIdAndAssetId = async (
  tenantId,
  assetId
) => {
  try {
    const affectedRows =
      await assetModel.deleteAssetByTenantAndAssetId(
        tenantId,
        assetId
      );
    if (affectedRows === 0) {
      throw new CustomError("Asset not found.", 404);
    }

    await invalidateCacheByPattern("asset:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete asset: ${error.message}`,
      404
    );
  }
};

const getAllAssetsByTenantIdAndClinicIdAndStartDateAndEndDate = async (
  tenantId,
  clinicId,
  startDate,
  endDate
) => {
  const cacheKey = `asset:datewise:${tenantId}`;

  const jsonFields = ["description"];

  try {
    const assets = await getOrSetCache(cacheKey, async () => {
      const result = await assetModel.getAllAssetsByTenantIdAndClinicIdAndStartDateAndEndDate(
        tenantId, clinicId,startDate,endDate
      );
      return result;
    });

    if (assets && assets.length > 0) {
      assets.forEach((asset) => {
      
        // Handling date_of_birth field conversion
        if (asset.purchased_date) {
          asset.purchased_date = formatDateOnly(asset.purchased_date);
        }
        if (asset.expired_date) {
          asset.expired_date = formatDateOnly(asset.expired_date);
        }
      });
    }

    return helper.decodeJsonFields(assets, jsonFields);
  } catch (err) {
    console.error("Database error while fetching assets:", err);
    throw new CustomError("Failed to fetch assets", 404);
  }
};

module.exports = {
  createAsset,
  getAllAssetsByTenantId,
  getAssetByTenantIdAndAssetId,
  updateAsset,
  deleteAssetByTenantIdAndAssetId,
  getAllAssetsByTenantIdAndClinicIdAndStartDateAndEndDate
};
