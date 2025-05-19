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
    asset_name:(val)=>val,
    asset_type:(val)=>val,
    asset_status:(val)=>val,
    asset_photo:(val)=>val,
    allocated_to:(val)=>val,
    quantity:(val)=>val,
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
    await invalidateCacheByPattern("assetByPatientId:*");
    return assetId;
  } catch (error) {
    console.error("Failed to create asset:", error);
    throw new CustomError(
      `Failed to create asset: ${error.message}`,
      500
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

  const jsonFields = ["medication", "side_effects", "instructions", "notes"];

  try {
    const assets = await getOrSetCache(cacheKey, async () => {
      const result = await assetModel.getAllAssetsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    return helper.decodeJsonFields(assets, jsonFields);
  } catch (err) {
    console.error("Database error while fetching assets:", err);
    throw new CustomError("Failed to fetch assets", 500);
  }
};

const getAllAssetsByTenantAndPatientId = async (
  tenantId,
  patientId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `assetByPatientId:${tenantId}:page:${page}:limit:${limit}`;

  const jsonFields = ["medication", "side_effects", "instructions", "notes"];
  const booleanFields = ["refill_allowed", "is_active"];

  try {
    const assets = await getOrSetCache(cacheKey, async () => {
      const result =
        await assetModel.getAllAssetsByTenantAndPatientId(
          tenantId,
          patientId,
          Number(limit),
          offset
        );
      return result;
    });

    const parsed = helper.decodeJsonFields(assets, jsonFields);
    parsed.forEach(async(p) => {
      helper.mapBooleanFields(p, booleanFields);
    });
    return parsed.map((p) => ({
      ...p,
      start_date: formatDateOnly(p.start_date),
      end_date: formatDateOnly(p.end_date),
    }));
  } catch (err) {
    console.error("Database error while fetching assets:", err);
    throw new CustomError("Failed to fetch assets", 500);
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
    const fieldsToDecode = [
      "medication",
      "side_effects",
      "instructions",
      "notes",
    ];
    return decodeJsonFields(asset, fieldsToDecode);
  } catch (error) {
    throw new CustomError("Failed to get asset: " + error.message, 500);
  }
};

// Update Asset
const updateAsset = async (assetId, data, tenant_id) => {
    const fieldMap = {
        tenant_id: (val) => val,
        asset_name:(val)=>val,
        asset_type:(val)=>val,
        asset_status:(val)=>val,
        asset_photo:(val)=>val,
        allocated_to:(val)=>val,
        quantity:(val)=>val,
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
    await invalidateCacheByPattern("assetByPatientId:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update asset", 500);
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
    await invalidateCacheByPattern("assetByPatientId:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete asset: ${error.message}`,
      500
    );
  }
};

module.exports = {
  createAsset,
  getAllAssetsByTenantId,
  getAssetByTenantIdAndAssetId,
  updateAsset,
  deleteAssetByTenantIdAndAssetId
};
