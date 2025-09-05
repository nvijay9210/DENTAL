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
  app_name: (val) => val,
  keycloak_user_id: (val) => val,
  activity_type: (val) => val,
  activity_desc: (val) => val,
  ip_address: (val) => val,
  user_agent: (val) => helper.safeStringify(val)
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
    const user_activity_id = await useractivityModel.createUserActivity(
      "user_activity",
      columns,
      values
    );
    await invalidateCacheByPattern("user_activity:*");
    return user_activity_id;
  } catch (error) {
    console.error("Failed to create user_activity:", error);
    throw new CustomError(
      `Failed to create user_activity: ${error.message}`,
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
  const cacheKey = `user_activity:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const useractivitys = await getOrSetCache(cacheKey, async () => {
      const result = await useractivityModel.getAllUserActivitysByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = useractivitys.data.map((user_activity) =>
      helper.convertDbToFrontend(user_activity, userActivityFieldsReverseMap)
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
  user_activity_id
) => {
  try {
    const user_activity =
      await useractivityModel.getUserActivityByTenantAndUserActivityId(
        tenantId,
        user_activity_id
      );

    const convertedRows = helper.convertDbToFrontend(
      user_activity,
      userActivityFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError(err, 500);
  }
};

// Update UserActivity
const updateUserActivity = async (user_activity_id, data) => {
  try {
    const { columns, values } = mapFields(data, userActivityFields);
    const affectedRows = await useractivityModel.updateUserActivity(
      user_activity_id,
      columns,
      values
    );

    // if (affectedRows === 0) {
    //   throw new CustomError(err, 500);
    // }

    await invalidateCacheByPattern("user_activity:*");
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
