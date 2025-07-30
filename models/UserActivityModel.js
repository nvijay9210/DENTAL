const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "useractivity";

// Create UserActivity
const createUserActivity = async (table,columns, values) => {
  try {
    const useractivity = await record.createRecord(table, columns, values);

    return useractivity.insertId;
  } catch (error) {
    console.error("Error creating useractivity:", error);
    throw error
  }
};

// Get all useractivitys by tenant ID with pagination
const getAllUserActivitysByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw error
    }
    return await record.getAllRecords("useractivity", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching useractivitys:", error);
    throw error
  }
};

// Get useractivity by tenant ID and useractivity ID
const getUserActivityByTenantAndUserActivityId = async (tenant_id, useractivity_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "useractivity_id",
      useractivity_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching useractivity:", error);
    throw error
  }
};

// Update useractivity
const updateUserActivity = async (useractivity_id, columns, values) => {
  try {
    const conditionColumn = ["useractivity_id"];
    const conditionValue = [useractivity_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating useractivity:", error);
    throw error
  }
};



module.exports = {
  createUserActivity,
  getAllUserActivitysByTenantId,
  getUserActivityByTenantAndUserActivityId,
  updateUserActivity
};
