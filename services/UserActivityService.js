const { CustomError } = require("../middlewares/CustomeError");
const useractivityModel = require("../models/UserActivityModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");

const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const { convertUTCToLocal } = require("../utils/DateUtils");

// Field mapping for useractivitys (similar to treatment)

const userActivityFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_user_id: (val) => val,
  operation: (val) => val, // e.g., GET, POST
  url: (val) => val,
  method: (val) => val,
  ip_address: (val) => val,
  browser_info: (val) => helper.safeStringify(val),
  device_info: (val) => helper.safeStringify(val),
  status: (val) => val, // e.g., success/failure
  message: (val) => val,
};

const userActivityFieldsReverseMap = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_user_id: (val) => val,
  operation: (val) => val,
  url: (val) => val,
  method: (val) => val,
  ip_address: (val) => val,
  browser_info: (val) => helper.safeJsonParse(val),
  device_info: (val) => helper.safeJsonParse(val),
  status: (val) => val,
  message: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
};

// Create UserActivity

const createUserActivity = async (data) => {
  try {
    const { columns, values } = mapFields(data, userActivityFields);
    const useractivityId = await useractivityModel.createUserActivity(
      "useractivity",
      columns,
      values
    );
    await invalidateCacheByPattern("useractivity:*");
    return useractivityId;
  } catch (error) {
    console.error("Failed to create useractivity:", error);
    throw new CustomError(
      `Failed to create useractivity: ${error.message}`,
      404
    );
  }
};

// Get All UserActivitys by Tenant ID with Caching
const getAllUserActivitysByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `useractivity:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const useractivitys = await getOrSetCache(cacheKey, async () => {
      const result = await useractivityModel.getAllUserActivitysByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = useractivitys.data.map((useractivity) =>
      helper.convertDbToFrontend(useractivity, userActivityFieldsReverseMap)
    );

    return { data: convertedRows, total: useractivitys.total };
  } catch (err) {
    console.error("Database error while fetching useractivitys:", err);
    throw new CustomError(err, 500);
  }
};

// Get UserActivity by ID & Tenant
const getUserActivityByTenantIdAndUserActivityId = async (
  tenantId,
  useractivityId
) => {
  try {
    const useractivity =
      await useractivityModel.getUserActivityByTenantAndUserActivityId(
        tenantId,
        useractivityId
      );

    const convertedRows = helper.convertDbToFrontend(
      useractivity,
      userActivityFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError(err, 500);
  }
};

// Update UserActivity
const updateUserActivity = async (useractivityId, data) => {
  try {
    const { columns, values } = mapFields(data, userActivityFields);
    const affectedRows = await useractivityModel.updateUserActivity(
      useractivityId,
      columns,
      values
    );

    // if (affectedRows === 0) {
    //   throw new CustomError(err, 500);
    // }

    await invalidateCacheByPattern("useractivity:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError(err, 500);
  }
};

module.exports = {
  createUserActivity,
  getAllUserActivitysByTenantId,
  getUserActivityByTenantIdAndUserActivityId,
  updateUserActivity
};
