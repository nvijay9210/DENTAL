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
  user_activity_id: (val) => val,
  tenant_id: (val) => val,
  app_name: (val) => val,
  keycloak_user_id: (val) => val,
  activity_type: (val) => val,
  activity_desc: (val) => val,
  ip_address: (val) => val,
  user_agent: (val) => helper.safeStringify(val),
  activity_time: (val) => val, // keep as is or format when needed
};

const userActivityFieldsReverseMap = {
  user_activity_id: (val) => val,
  tenant_id: (val) => val,
  app_name: (val) => val,
  keycloak_user_id: (val) => val,
  activity_type: (val) => val,
  activity_desc: (val) => val,
  ip_address: (val) => val,
  user_agent: (val) => helper.safeJsonParse(val),
  activity_time: (val) => (val ? convertUTCToLocal(val) : null),
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
