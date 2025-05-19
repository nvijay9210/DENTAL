const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "asset";

// Create Asset
const createAsset = async (table,columns, values) => {
  try {
    const asset = await record.createRecord(table, columns, values);
    return asset.insertId;
  } catch (error) {
    console.error("Error creating asset:", error);
    throw new CustomError("Database Query Error", 500);
  }
};

// Get all assets by tenant ID with pagination
const getAllAssetsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords(TABLE, "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching assets:", error);
    throw new CustomError("Error fetching assets.", 500);
  }
};

// Get asset by tenant ID and asset ID
const getAssetByTenantAndAssetId = async (tenant_id, asset_id) => {
  try {
    const [rows] = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "asset_id",
      asset_id
    );
    return rows?.[0] ?? null;
  } catch (error) {
    console.error("Error fetching asset:", error);
    throw new CustomError("Error fetching asset.", 500);
  }
};

// Update asset
const updateAsset = async (asset_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "asset_id"];
    const conditionValue = [tenant_id, asset_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating asset:", error);
    throw new CustomError("Error updating asset.", 500);
  }
};

// Delete asset
const deleteAssetByTenantAndAssetId = async (tenant_id, asset_id) => {
  try {
    const conditionColumn = ["tenant_id", "asset_id"];
    const conditionValue = [tenant_id, asset_id];

    const [result] = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting asset:", error);
    throw new CustomError("Error deleting asset.", 500);
  }
};



module.exports = {
  createAsset,
  getAllAssetsByTenantId,
  getAssetByTenantAndAssetId,
  updateAsset,
  deleteAssetByTenantAndAssetId,
};
