const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "loginhistory";

// Create LoginHistory
const createLoginHistory = async (table,columns, values) => {
  try {
    const loginhistory = await record.createRecord(table, columns, values);
    console.log(loginhistory)
    return loginhistory.insertId;
  } catch (error) {
    console.error("Error creating loginhistory:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all loginhistorys by tenant ID with pagination
const getAllLoginHistorysByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords("loginhistory", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching loginhistorys:", error);
    throw new CustomError("Error fetching loginhistorys.", 500);
  }
};

// Get loginhistory by tenant ID and loginhistory ID
const getLoginHistoryByTenantAndLoginHistoryId = async (tenant_id, loginhistory_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "loginhistory_id",
      loginhistory_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching loginhistory:", error);
    throw new CustomError("Error fetching loginhistory.", 500);
  }
};

// Update loginhistory
const updateLoginHistory = async (loginhistory_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "loginhistory_id"];
    const conditionValue = [tenant_id, loginhistory_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating loginhistory:", error);
    throw new CustomError("Error updating loginhistory.", 500);
  }
};

// Delete loginhistory
const deleteLoginHistoryByTenantAndLoginHistoryId = async (tenant_id, loginhistory_id) => {
  try {
    const conditionColumn = ["tenant_id", "loginhistory_id"];
    const conditionValue = [tenant_id, loginhistory_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting loginhistory:", error);
    throw new CustomError("Error deleting loginhistory.", 500);
  }
};



module.exports = {
  createLoginHistory,
  getAllLoginHistorysByTenantId,
  getLoginHistoryByTenantAndLoginHistoryId,
  updateLoginHistory,
  deleteLoginHistoryByTenantAndLoginHistoryId,
};
