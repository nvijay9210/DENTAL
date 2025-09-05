const { CustomError } = require("../middlewares/CustomeError");
const loginhistoryModel = require("../models/LoginHistoryModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");

const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const { convertUTCToLocal, isoToSqlDatetime, formatDateOnly, formatDateTime } = require("../utils/DateUtils");
const { default: KeycloakAdminClient } = require("keycloak-admin");

// Field mapping for loginhistorys (similar to treatment)

const loginhistoryFields = {
  tenant_id: (val) => val,
  app_name: (val) => val,
  keycloak_user_id: (val) => val,
  session_id: (val) => val,
  ip_address: (val) => val,
  // Combine browser_info + device_info → user_agent
  user_agent: (val, fullRow) => {
    const combined = {
      browser_info: fullRow.browser_info || null,
      device_info: fullRow.device_info || null
    };
    return JSON.stringify(combined);
  },
  login_time: (val) => val,
  logout_time: (val) => val,
  // created_time is auto-generated, skip
};

const loginhistoryFieldsReverseMap = {
  login_history_id: (val) => val,
  tenant_id: (val) => val,
  app_name: (val) => val,
  keycloak_user_id: (val) => val,
  session_id: (val) => val,
  login_time: (val) => val?formatDateTime(val):null,
  logout_time: (val) => val?formatDateTime(val):null,
  ip_address: (val) => val,
  // Parse user_agent JSON → split into browser_info & device_info
  user_agent: (val) => {
    const parsed = helper.safeJsonParse(val, {});
    return {
      browser_info: parsed.browser_info || null,
      device_info: parsed.device_info || null
    };
  },
  created_time: (val) => (val ? formatDateOnly(val) : null),
};

// Create LoginHistory
const createLoginHistory = async (data) => {
  
  try {
    const { columns, values } = mapFields(data, loginhistoryFields);

    const loginhistoryId = await loginhistoryModel.createLoginHistory(
      "login_history",
      columns,
      values
    );
    await invalidateCacheByPattern("login_history:*");
    return loginhistoryId;
  } catch (error) {
    console.error("Failed to create login_history:", error);
    throw new CustomError(
      `Failed to create login_history: ${error.message}`,
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
  const cacheKey = `login_history:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const loginhistorys = await getOrSetCache(cacheKey, async () => {
      const result = await loginhistoryModel.getAllLoginHistorysByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = loginhistorys.data.map((login_history) =>
      helper.convertDbToFrontend(login_history, loginhistoryFieldsReverseMap)
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
    const login_history =
      await loginhistoryModel.getLoginHistoryByTenantAndLoginHistoryId(
        tenantId,
        loginhistoryId
      );

    const convertedRows = helper.convertDbToFrontend(
      login_history,
      loginhistoryFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to fetch login_history: " + error.message, 404);
  }
};

const getLoginHistoryByTenantAndKeycloakUserId = async (
  tenantId,
  keycloak_user_id
) => {
  try {
    const login_history =
      await loginhistoryModel.getLoginHistoryByTenantAndKeycloakUserId(
        tenantId,
        keycloak_user_id
      );

    const convertedRows = helper.convertDbToFrontend(
      login_history,
      loginhistoryFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    console.log(error)
    throw new CustomError("Failed to fetch login_history: " + error.message, 404);
  }
};

// Update LoginHistory
const updateLoginHistory = async (loginhistoryId, data, tenant_id) => {
  try {
    const { columns, values } = mapFields(data, loginhistoryFields);
    const affectedRows = await loginhistoryModel.updateLoginHistory(
      loginhistoryId,
      columns,
      values,
      tenant_id
    );

    // if (affectedRows === 0) {
    //   throw new CustomError("LoginHistory not found or no changes made.", 404);
    // }

    await invalidateCacheByPattern("login_history:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update login_history", 404);
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
    // if (affectedRows === 0) {
    //   throw new CustomError("LoginHistory not found.", 404);
    // }

    await invalidateCacheByPattern("login_history:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete login_history: ${error.message}`,
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
  getLoginHistoryByTenantAndKeycloakUserId
};
