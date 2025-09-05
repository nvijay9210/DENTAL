const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE ="login_history";

// Create LoginHistory
const createLoginHistory = async (table,columns, values) => {
  try {
    const loginhistory = await record.createRecord(table, columns, values);
 
    return loginhistory.insertId;
  } catch (error) {
    console.error("Error creating loginhistory:", error);
    throw error
  }
};

// Get all loginhistorys by tenant ID with pagination
const getAllLoginHistorysByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw error
    }
    return await record.getAllRecords("loginhistory", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching loginhistorys:", error);
    throw error
  }
};

// Get loginhistory by tenant ID and loginhistory ID
const getLoginHistoryByTenantAndLoginHistoryId = async (tenant_id, login_history_id) => {
  try {
    const [rows] = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "login_history_id",
      login_history_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching loginhistory:", error);
    throw error
  }
};


const getLoginHistoryByTenantAndKeycloakUserId = async (tenantId,keycloak_user_id) => {
  const query1 = `SELECT * FROM login_history  WHERE tenant_id = ? AND keycloak_user_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      keycloak_user_id
    ]);
    
    return rows.at(-1)
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

// const getLoginHistoryByTenantAndKeycloakUserId = async (tenant_id, keycloak_user_id) => {
//   try {
//     console.log(tenant_id,keycloak_user_id)
//     const rows = await record.getRecordByIdAndTenantId(
//       TABLE,
//       "tenant_id",
//       tenant_id,
//       "keycloak_user_id",
//       keycloak_user_id
//     );
//     console.log(rows)
//     return rows
//   } catch (error) {
//     console.error("Error fetching loginhistory:", error);
//     throw error
//   }
// };

// Update loginhistory


const updateLoginHistory = async (login_history_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "login_history_id"];
    const conditionValue = [tenant_id, login_history_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating loginhistory:", error);
    throw error
  }
};

// Delete loginhistory
const deleteLoginHistoryByTenantAndLoginHistoryId = async (tenant_id, login_history_id) => {
  try {
    const conditionColumn = ["tenant_id", "login_history_id"];
    const conditionValue = [tenant_id, login_history_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting loginhistory:", error);
    throw error
  }
};



module.exports = {
  createLoginHistory,
  getAllLoginHistorysByTenantId,
  getLoginHistoryByTenantAndLoginHistoryId,
  updateLoginHistory,
  deleteLoginHistoryByTenantAndLoginHistoryId,
  getLoginHistoryByTenantAndKeycloakUserId
};
