const { CustomError } = require("../middlewares/CustomeError");
const loginhistoryModel = require("../models/LoginHistoryModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");

const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

// Field mapping for loginhistorys (similar to treatment)

const loginhistoryFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_user_id: (val) => val,
  useractivity_id: (val) => val,
  ip_address: (val) => val,
  browser_info: (val) => val,
  device_info: (val) => val,
  login_time: (val) => val,
  logout_time: (val) => val,
};
const loginhistoryFieldsReverseMap = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_user_id: (val) => val,
  useractivity_id: (val) => val,
  ip_address: (val) => val,
  browser_info: (val) => val,
  device_info: (val) => val,
  login_time: (val) => val,
  logout_time: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? new Date(val).toISOString() : null),
};
// Create LoginHistory
const createLoginHistory = async (data) => {
  const fieldMap = {
    ...loginhistoryFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const loginhistoryId = await loginhistoryModel.createLoginHistory(
      "loginhistory",
      columns,
      values
    );
    await invalidateCacheByPattern("loginhistory:*");
    return loginhistoryId;
  } catch (error) {
    console.error("Failed to create loginhistory:", error);
    throw new CustomError(
      `Failed to create loginhistory: ${error.message}`,
      404
    );
  }
};

// Get All LoginHistorys by Tenant ID with Caching
const getAllLoginHistorysByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `loginhistory:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const loginhistorys = await getOrSetCache(cacheKey, async () => {
      const result = await loginhistoryModel.getAllLoginHistorysByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = loginhistorys.data.map((loginhistory) =>
      helper.convertDbToFrontend(loginhistory, loginhistoryFieldsReverseMap)
    );

    return { data: convertedRows, total: loginhistorys.total };
  } catch (err) {
    console.error("Database error while fetching loginhistorys:", err);
    throw new CustomError("Failed to fetch loginhistorys", 404);
  }
};

// Get LoginHistory by ID & Tenant
const getLoginHistoryByTenantIdAndLoginHistoryId = async (
  tenantId,
  loginhistoryId
) => {
  try {
    const loginhistory =
      await loginhistoryModel.getLoginHistoryByTenantAndLoginHistoryId(
        tenantId,
        loginhistoryId
      );

    const convertedRows = helper.convertDbToFrontend(
      loginhistory,
      loginhistoryFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get loginhistory: " + error.message, 404);
  }
};

// Update LoginHistory
const updateLoginHistory = async (loginhistoryId, data, tenant_id) => {
  const fieldMap = {
    ...loginhistoryFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await loginhistoryModel.updateLoginHistory(
      loginhistoryId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("LoginHistory not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("loginhistory:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update loginhistory", 404);
  }
};

// Delete LoginHistory
const deleteLoginHistoryByTenantIdAndLoginHistoryId = async (
  tenantId,
  loginhistoryId
) => {
  try {
    const affectedRows =
      await loginhistoryModel.deleteLoginHistoryByTenantAndLoginHistoryId(
        tenantId,
        loginhistoryId
      );
    if (affectedRows === 0) {
      throw new CustomError("LoginHistory not found.", 404);
    }

    await invalidateCacheByPattern("loginhistory:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete loginhistory: ${error.message}`,
      404
    );
  }
};

module.exports = {
  createLoginHistory,
  getAllLoginHistorysByTenantId,
  getLoginHistoryByTenantIdAndLoginHistoryId,
  updateLoginHistory,
  deleteLoginHistoryByTenantIdAndLoginHistoryId,
};
