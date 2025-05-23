const { CustomError } = require("../middlewares/CustomeError");
const statusTypeSubModel = require("../models/StatusTypeSubModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { mapFields } = require("../query/Records");
const {
  getStatusTypeIdByTenantAndStatusType,
} = require("../models/StatusTypeModel");
const helper = require("../utils/Helpers");
const statusTypeSubFields = {
  tenant_id: (val) => val,
  status_type_id: (val) => val,
  status_type_sub: (val) => val,
  status_type_sub_ref: (val) => val,
};
const statusTypeSubFieldsReverseMap = {
  status_type_sub_id: (val) => val,
  tenant_id: (val) => val,
  status_type_id: (val) => val,
  status_type_sub: (val) => val,
  status_type_sub_ref: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? new Date(val).toISOString() : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? new Date(val).toISOString() : null),
};
// Create StatusTypeSub
const createStatusTypeSub = async (details, statusType) => {
  const fieldMap = {
    ...statusTypeSubFields,
    created_by: (val) => val,
  };

  try {
    const status_type_id = await getStatusTypeIdByTenantAndStatusType(
      statusType
    );

    details.status_type_id = status_type_id;

    const { columns, values } = mapFields(details, fieldMap);
    const statusTypeSubId = await statusTypeSubModel.createStatusTypeSub(
      "statustypesub",
      columns,
      values
    );
    await invalidateCacheByPattern("statusTypeSub:*");
    return statusTypeSubId;
  } catch (error) {
    console.error("Failed to create statusTypeSub:", error);
    throw new CustomError(
      `Failed to create statusTypeSub: ${error.message}`,
      404
    );
  }
};

// Get All StatusTypeSubs by Tenant ID with Caching
const getAllStatusTypeSubsByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `statusTypeSub:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const statusTypeSubs = await getOrSetCache(cacheKey, async () => {
      const result = await statusTypeSubModel.getAllStatusTypeSubsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = statusTypeSubs.map((statusTypeSub) =>
      helper.convertDbToFrontend(statusTypeSub, statusTypeSubFieldsReverseMap)
    );

    return convertedRows;
  } catch (err) {
    console.error("Database error while fetching statusTypeSubs:", err);
    throw new CustomError("Failed to fetch statusTypeSubs", 404);
  }
};
const getAllStatusTypeSubByTenantIdAndStatusTypeId = async (
  tenantId,
  status_type_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `statusTypeSub:${tenantId}:status_type_id:${status_type_id}:page:${page}:limit:${limit}`;

  try {
    const statusTypeSubs = await getOrSetCache(cacheKey, async () => {
      const result =
        await statusTypeSubModel.getAllStatusTypeSubByTenantIdAndStatusTypeId(
          tenantId,
          status_type_id,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = helper.convertDbToFrontend(
      statusTypeSubs,
      statusTypeSubFieldsReverseMap
    );

    return convertedRows;
  } catch (err) {
    console.error("Database error while fetching statusTypeSubs:", err);
    throw new CustomError("Failed to fetch statusTypeSubs", 404);
  }
};

const getAllStatusTypeSubByTenantIdAndStatusType = async (
  tenantId,
  status_type,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `statusTypeSub:${tenantId}:status_type:${status_type}:page:${page}:limit:${limit}`;

  try {
    const statusTypeSubs = await getOrSetCache(cacheKey, async () => {
      const statusTypeId = await getStatusTypeIdByTenantAndStatusType(
        status_type
      );

      const result =
        await statusTypeSubModel.getAllStatusTypeSubByTenantIdAndStatusTypeId(
          tenantId,
          statusTypeId,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = statusTypeSubs.map((statusTypeSub) =>
      helper.convertDbToFrontend(statusTypeSub, statusTypeSubFieldsReverseMap)
    );

    return convertedRows;
  } catch (err) {
    console.error("Database error while fetching statusTypeSubs:", err);
    throw new CustomError("Failed to fetch statusTypeSubs", 404);
  }
};

const getAllStatusTypeSubByStatusTypeAndTenantId = async (
  status_type,
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `statusTypeSub:${tenantId}:statusType:${status_type}:page:${page}:limit:${limit}`;

  try {
    const statusTypeSubs = await getOrSetCache(cacheKey, async () => {
      const result =
        await statusTypeSubModel.getAllStatusTypeSubByStatusTypeAndTenantId(
          status_type,
          tenantId,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = statusTypeSubs.map((statusTypeSub) =>
      helper.convertDbToFrontend(statusTypeSub, statusTypeSubFieldsReverseMap)
    );

    return convertedRows;
  } catch (err) {
    console.error("Database error while fetching statusTypeSubs:", err);
    throw new CustomError("Failed to fetch statusTypeSubs", 404);
  }
};

// Get StatusTypeSub by ID & Tenant
const getStatusTypeSubByTenantIdAndStatusTypeSubId = async (
  tenantId,
  statusTypeSubId
) => {
  try {
    const statusTypeSub =
      await statusTypeSubModel.getStatusTypeSubByTenantAndStatusTypeSubId(
        tenantId,
        statusTypeSubId
      );
    const convertedRows = helper.convertDbToFrontend(
      statusTypeSub,
      statusTypeSubFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get statusTypeSub: " + error.message, 404);
  }
};

// Update StatusTypeSub
const updateStatusTypeSub = async (statusTypeSubId, data, tenant_id) => {
  const fieldMap = {
    ...statusTypeSubFields,
    updated_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await statusTypeSubModel.updateStatusTypeSub(
      statusTypeSubId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("StatusTypeSub not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("statusTypeSub:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update statusTypeSub", 404);
  }
};

// Delete StatusTypeSub
const deleteStatusTypeSubByTenantIdAndStatusTypeSubId = async (
  tenantId,
  statusTypeSubId
) => {
  try {
    const affectedRows =
      await statusTypeSubModel.deleteStatusTypeSubByTenantAndStatusTypeSubId(
        tenantId,
        statusTypeSubId
      );
    if (affectedRows === 0) {
      throw new CustomError("StatusTypeSub not found.", 404);
    }

    await invalidateCacheByPattern("statusTypeSub:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete statusTypeSub: ${error.message}`,
      404
    );
  }
};

module.exports = {
  createStatusTypeSub,
  getAllStatusTypeSubsByTenantId,
  getStatusTypeSubByTenantIdAndStatusTypeSubId,
  updateStatusTypeSub,
  deleteStatusTypeSubByTenantIdAndStatusTypeSubId,
  getAllStatusTypeSubByStatusTypeAndTenantId,
  getAllStatusTypeSubByTenantIdAndStatusTypeId,
  getAllStatusTypeSubByTenantIdAndStatusType,
};
