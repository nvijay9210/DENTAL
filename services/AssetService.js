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

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");
const { buildCacheKey } = require("../utils/RedisCache");

const assetFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  asset_name: (val) => val,
  asset_type: (val) => val,
  asset_status: (val) => val,
  asset_photo: (val) => val,
  allocated_to: (val) => val,
  quantity: (val) => val? parseInt(val) : 0,
  price: (val) => val? parseFloat(val) : 0,
  purchased_date: (val) => val,
  purchased_by: (val) => val,
  expired_date: (val) => val,
  invoice_number: (val) => val,
  description: helper.safeStringify,
};

const assetFieldsReverseMap = {
  asset_id:val=>val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  asset_name: (val) => val,
  asset_type: (val) => val,
  asset_status: (val) => val,
  asset_photo: (val) => val,
  allocated_to: (val) => val,
  quantity: (val) => val? parseInt(val) : 0,
  price: (val) => val? parseFloat(val) : 0,
  purchased_date: val => val ? formatDateOnly(val): null,
  purchased_by: (val) => val,
  expired_date: val => val ? formatDateOnly(val): null,
  invoice_number: (val) => val,
  description:val=> helper.safeJsonParse(val),
  created_by: val => val,
  created_time: val => val ? convertUTCToLocal(val) : null,
  updated_by: val => val,
  updated_time: val => val ? convertUTCToLocal(val) : null
};

// Field mapping for assets (similar to treatment)

// Create Asset
const createAsset = async (data) => {
  const fieldMap = {
    ...assetFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const assetId = await assetModel.createAsset("asset", columns, values);
    await invalidateCacheByPattern("asset:*");
    return assetId;
  } catch (error) {
    console.error("Failed to create asset:", error);
    throw new CustomError(`Failed to create asset: ${error.message}`, 404);
  }
};

// Get All Assets by Tenant ID with Caching
const getAllAssetsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("asset", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });
  try {
    const assets = await getOrSetCache(cacheKey, async () => {
      const result = await assetModel.getAllAssetsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = assets.data.map(asset => helper.convertDbToFrontend(asset, assetFieldsReverseMap));
    
        return {data:convertedRows,total:assets.total};;
     
  } catch (err) {
    console.error("Database error while fetching assets:", err);
    throw new CustomError("Failed to fetch assets", 404);
  }
};

// Get Asset by ID & Tenant
const getAssetByTenantIdAndAssetId = async (tenantId, assetId) => {
  try {
    const asset = await assetModel.getAssetByTenantAndAssetId(
      tenantId,
      assetId
    );
    const convertedRows = helper.convertDbToFrontend(asset, assetFieldsReverseMap);
    
        return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get asset: " + error.message, 404);
  }
};

// Update Asset
const updateAsset = async (assetId, data, tenant_id) => {
  const fieldMap = {
    ...assetFields,
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
const deleteAssetByTenantIdAndAssetId = async (tenantId, assetId) => {
  try {
    const affectedRows = await assetModel.deleteAssetByTenantAndAssetId(
      tenantId,
      assetId
    );
    if (affectedRows === 0) {
      throw new CustomError("Asset not found.", 404);
    }

    await invalidateCacheByPattern("asset:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete asset: ${error.message}`, 404);
  }
};

const getAllAssetsByTenantIdAndClinicIdAndStartDateAndEndDate = async (
  tenantId,
  clinicId,
  startDate,
  endDate,
  page=1,
  limit=10
) => {
  const cacheKey = buildCacheKey("asset", "list", {
    tenant_id: tenantId,
    clinic_id: clinicId,
    startDate,
    endDate,
    page,
    limit,
  });
  const offset = (page - 1) * limit;
  try {
    const assets = await getOrSetCache(cacheKey, async () => {
      const result =
        await assetModel.getAllAssetsByTenantIdAndClinicIdAndStartDateAndEndDate(
          tenantId,
          clinicId,
          startDate,
          endDate,
          parseInt(offset),
          parseInt(limit)
        );
      return result;
    });

    const convertedRows = assets.data.map(asset => helper.convertDbToFrontend(asset, assetFieldsReverseMap));
    
      return {data:convertedRows,total:assets.total};;
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
  getAllAssetsByTenantIdAndClinicIdAndStartDateAndEndDate,
};
