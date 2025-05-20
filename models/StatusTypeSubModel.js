const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "statustypesub";

// Create StatusTypeSub
const createStatusTypeSub = async (table, columns, values) => {
  console.log("statusTypeSub", columns, values);
  try {
    const statusTypeSub = await record.createRecord(table, columns, values);
    return statusTypeSub.insertId;
  } catch (error) {
    console.error("Error creating statusTypeSub:", error);
    throw new CustomError("Database Query Error", 500);
  }
};

// Get all statusTypeSubs by tenant ID with pagination
const getAllStatusTypeSubsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (
      !Number.isInteger(limit) ||
      !Number.isInteger(offset) ||
      limit < 1 ||
      offset < 0
    ) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords(
      TABLE,
      "tenant_id",
      tenantId,
      limit,
      offset
    );
  } catch (error) {
    console.error("Error fetching statusTypeSubs:", error);
    throw new CustomError("Error fetching statusTypeSubs.", 500);
  }
};

// Get statusTypeSub by tenant ID and statusTypeSub ID
const getStatusTypeSubByTenantAndStatusTypeSubId = async (
  tenant_id,
  statusTypeSub_id
) => {
  try {
    const [rows] = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "statusTypeSub_id",
      statusTypeSub_id
    );
    return rows?.[0] ?? null;
  } catch (error) {
    console.error("Error fetching statusTypeSub:", error);
    throw new CustomError("Error fetching statusTypeSub.", 500);
  }
};

// Update statusTypeSub
const updateStatusTypeSub = async (
  statusTypeSub_id,
  columns,
  values,
  tenant_id
) => {
  try {
    const conditionColumn = ["tenant_id", "status_type_sub_id"];
    const conditionValue = [tenant_id, statusTypeSub_id];

    return await record.updateRecord(
      TABLE,
      columns,
      values,
      conditionColumn,
      conditionValue
    );
  } catch (error) {
    console.error("Error updating statusTypeSub:", error);
    throw new CustomError("Error updating statusTypeSub.", 500);
  }
};

// Delete statusTypeSub
const deleteStatusTypeSubByTenantAndStatusTypeSubId = async (
  tenant_id,
  statusTypeSub_id
) => {
  try {
    const conditionColumn = ["tenant_id", "statusTypeSub_id"];
    const conditionValue = [tenant_id, statusTypeSub_id];

    const [result] = await record.deleteRecord(
      TABLE,
      conditionColumn,
      conditionValue
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting statusTypeSub:", error);
    throw new CustomError("Error deleting statusTypeSub.", 500);
  }
};

const getAllStatusTypeSubByStatusTypeAndTenantId = async (
  tenant_id,
  status_type_id,
  status_type_sub
) => {
  const conn = await pool.getConnection();
  try {
    const result = await conn.query(
      "select * from statustypesub where status_type_id=? and status_type_sub=? and tenant_id=? limit 1",
      [status_type_id, status_type_sub, tenant_id]
    );

    return result;
  } catch (err) {
    console.log(err.message);
    throw new CustomError(err.message, 404);
  } finally {
    conn.release();
  }
};

const getAllStatusTypeSubByTenantIdAndStatusTypeId = async (
  tenant_id,
  status_type_id,
  limit = 10,
  offset = 0
) => {
  const query = `
    SELECT * FROM statustypesub WHERE status_type_id = ? AND tenant_id = ? ORDER BY status_type_sub_ref ASC LIMIT ? OFFSET ?
  `;

  const conn = await pool.getConnection();
  try {
    console.log(status_type_id, tenant_id, limit, offset);
    const rows = await conn.query(query, [
      status_type_id,
      tenant_id,
      limit,
      offset,
    ]);

    console.log("rows:", rows);

    return rows[0];
  } catch (error) {
    console.error("Error fetching status_type_id:", error);
    throw new Error("Database Query Error");
  } finally {
    conn.release();
  }
};

const getAllStatusTypeSubByTenantIdAndStatusType = async (
  tenant_id,
  status_type,
  limit = 10,
  offset = 0
) => {
  const conn = await pool.getConnection();

  try {
    // Input validation
    if (!tenant_id || !status_type) {
      throw new CustomError("tenant_id and status_type are required", 400);
    }

    if (typeof limit !== "number" || limit < 1 || limit > 100) {
      limit = 10; // default
    }

    if (typeof offset !== "number" || offset < 0) {
      offset = 0; // default
    }

    const [rows] = await conn.query(
      "SELECT * FROM statustypesub WHERE status_type = ? AND tenant_id = ? ORDER BY status_type_sub_ref ASC LIMIT ? OFFSET ?",
      [status_type, tenant_id, limit, offset]
    );

    return rows;
  } catch (err) {
    console.error("Error fetching statustypesub:", err.message);
    throw new CustomError("Failed to fetch data", 500);
  } finally {
    conn.release();
  }
};

//step2
const checkStatusTypeSubExistsByStatusTypeIdAndStatusTypeSubAndTenantId =
  async (tenant_id, status_type_id, status_type_sub) => {
    const conn = await pool.getConnection();
    try {
      const result = await conn.query(
        "select 1 from statustypesub where status_type_id=? and status_type_sub=? and tenant_id=? limit 1",
        [status_type_id, status_type_sub, tenant_id]
      );

      return result.length > 0 ? true : false;
    } catch (err) {
      console.log(err.message);
      throw new CustomError(err.message, 404);
    } finally {
      conn.release();
    }
  };

//step3
const checkStatusTypeSubRefExistsByStatusTypeIdAndStatusTypeSubAndStatusTypeSubRefAndTenantId =
  async (tenant_id, status_type_id, status_type_sub, status_type_sub_ref) => {
    const conn = await pool.getConnection();
    try {
      const result = await conn.query(
        "select 1 from statustypesub where status_type_id=? and status_type_sub=? and status_type_sub_ref=? and tenant_id=? limit 1",
        [status_type_id, status_type_sub, status_type_sub_ref, tenant_id]
      );

      return result[0].length > 0 ? true : false;
    } catch (err) {
      console.log(err.message);
      throw new CustomError(err.message, 404);
    } finally {
      conn.release();
    }
  };

const checkStatusTypeSubRefExistsByStatusTypeSubIdAndStatusTypeSubAndStatusTypeSubRefAndTenantId =
  async (tenant_id, status_type_sub_id, status_type_sub_ref) => {
    const conn = await pool.getConnection();
    try {
      const result = await conn.query(
        "select 1 from statustypesub where status_type_sub_id!=? and status_type_sub_ref=? and tenant_id=? limit 1",
        [status_type_sub_id, status_type_sub_ref, tenant_id]
      );

      return result[0].length > 0 ? true : false;
    } catch (err) {
      console.log(err.message);
      throw new CustomError(err.message, 404);
    } finally {
      conn.release();
    }
  };

module.exports = {
  createStatusTypeSub,
  getAllStatusTypeSubsByTenantId,
  getStatusTypeSubByTenantAndStatusTypeSubId,
  updateStatusTypeSub,
  deleteStatusTypeSubByTenantAndStatusTypeSubId,
  getAllStatusTypeSubByStatusTypeAndTenantId,
  checkStatusTypeSubExistsByStatusTypeIdAndStatusTypeSubAndTenantId,
  checkStatusTypeSubRefExistsByStatusTypeIdAndStatusTypeSubAndStatusTypeSubRefAndTenantId,
  checkStatusTypeSubRefExistsByStatusTypeSubIdAndStatusTypeSubAndStatusTypeSubRefAndTenantId,
  getAllStatusTypeSubByTenantIdAndStatusTypeId,
  getAllStatusTypeSubByTenantIdAndStatusType,
};
