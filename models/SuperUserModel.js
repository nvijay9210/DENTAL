const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "superuser";

// Create SuperUser
const createSuperUser = async (conn,table,columns, values) => {
  try {
    const superuser = await record.createRecord(table, columns, values,conn);

    return superuser.insertId;
  } catch (error) {
    console.error("Error creating superuser:", error);
    throw error
  }
};

// Get all superusers by tenant ID with pagination
const getAllSuperUsersByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw error
    }
    return await record.getAllRecords("superuser", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching superusers:", error);
    throw error
  }
};

// Get superuser by tenant ID and superuser ID
const getSuperUserByTenantAndSuperUserId = async (tenant_id, superuser_id,connection) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "superuser_id",
      superuser_id,
      connection
    );
    return rows;
  } catch (error) {
    console.error("Error fetching superuser:", error);
    throw error
  }
};

// Update superuser
const updateSuperUser = async (superuser_id, columns, values, tenant_id,connection) => {
  try {
    const conditionColumn = ["tenant_id", "superuser_id"];
    const conditionValue = [tenant_id, superuser_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue,connection);
  } catch (error) {
    console.error("Error updating superuser:", error);
    throw error
  }
};

// Delete superuser
const deleteSuperUserByTenantAndSuperUserId = async (connection,tenant_id, superuser_id) => {
  try {
    const conditionColumn = ["tenant_id", "superuser_id"];
    const conditionValue = [tenant_id, superuser_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue,connection);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting superuser:", error);
    throw error
  }
};

const getAllSuperUsersByTenantIdAndClinicId = async (tenantId,clinicId, limit, offset) => {
  const query1 = `SELECT * FROM superuser  WHERE tenant_id = ? AND clinic_id = ? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM superuser  WHERE tenant_id = ? AND clinic_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [tenantId, clinicId]);
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getSuperUserByKeycloakId = async (tenantId,clinicId, limit, offset) => {
  const query1 = `SELECT * FROM superuser  WHERE tenant_id = ? AND clinic_id = ? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM superuser  WHERE tenant_id = ? AND clinic_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [tenantId, clinicId]);
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};



module.exports = {
  createSuperUser,
  getAllSuperUsersByTenantId,
  getSuperUserByTenantAndSuperUserId,
  updateSuperUser,
  deleteSuperUserByTenantAndSuperUserId,
  getAllSuperUsersByTenantIdAndClinicId
};
