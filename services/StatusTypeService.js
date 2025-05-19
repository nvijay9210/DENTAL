const { CustomError } = require("../middlewares/CustomeError");
const statusTypeModel = require("../models/StatusTypeModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");

// Create StatusType
const createStatusType = async (data) => {
  console.log("data:", data);
  const fieldMap = {
    tenant_id: (val) => val,
    statusType_type: (val) => val,
    created_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, fieldMap);
    const statusTypeId = await statusTypeModel.createStatusType(
      "statusType",
      columns,
      values
    );
    await invalidateCacheByPattern("statusType:*");
    await invalidateCacheByPattern("statusType_patient:*");
    return statusTypeId;
  } catch (error) {
    console.error("Failed to create statusType:", error);
    throw new CustomError(`Failed to create statusType: ${error.message}`, 404);
  }
};

// Get All StatusTypes by Tenant ID with Caching
const getAllStatusTypesByTenantId = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `statusType:page:${page}:limit:${limit}`;

  try {
    const statusTypes = await getOrSetCache(cacheKey, async () => {
      const result = await statusTypeModel.getAllStatusTypesByTenantId(
      
        Number(limit),
        offset
      );
      return result;
    });

    return statusTypes
  } catch (err) {
    console.error("Database error while fetching statusTypes:", err);
    throw new CustomError("Failed to fetch statusTypes", 404);
  }
};

// Get StatusType by ID & Tenant
const getStatusTypeByStatusTypeId = async ( statusTypeId) => {
  try {
    const statusType = await statusTypeModel.getStatusTypeByStatusTypeId(
      statusTypeId
    );
    return statusType;
  } catch (error) {
    throw new CustomError("Failed to get statusType: " + error.message, 404);
  }
};

// Update StatusType
const updateStatusType = async (statusTypeId, data, tenant_id) => {
    const fieldMap = {
        tenant_id: (val) => val,
        statusType_type: (val) => val,
        updated_by: (val) => val,
      };

  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await statusTypeModel.updateStatusType(
      statusTypeId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("StatusType not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("statusType:*");
    await invalidateCacheByPattern("statusType_patient:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update statusType", 404);
  }
};

// Delete StatusType
const deleteStatusTypeByTenantIdAndStatusTypeId = async (
  tenantId,
  statusTypeId
) => {
  try {
    const affectedRows =
      await statusTypeModel.deleteStatusTypeByTenantAndStatusTypeId(
        tenantId,
        statusTypeId
      );
    if (affectedRows === 0) {
      throw new CustomError("StatusType not found.", 404);
    }

    await invalidateCacheByPattern("statusType:*");
    await invalidateCacheByPattern("statusType_patient:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete statusType: ${error.message}`, 404);
  }
};

module.exports = {
  createStatusType,
  getAllStatusTypesByTenantId,
  getStatusTypeByStatusTypeId,
  updateStatusType,
  deleteStatusTypeByTenantIdAndStatusTypeId
};
