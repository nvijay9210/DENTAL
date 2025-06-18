const pool = require("../config/db");
const { tenantQuery } = require("../query/TenantQuery")

const record = require("../query/Records");
const { CustomError } = require("../middlewares/CustomeError");
;
const TABLE = "tenant";

const createTenant = async (table,columns, values) => {
  try {
    const tenant = await record.createRecord(table, columns, values);
    return tenant.insertId;
  } catch (error) {
    console.error("Error creating tenant:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

const getAllTenant = async () => {
  const query = tenantQuery.getAllTenant;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query);
  
    return rows;
  } catch (error) {
    console.error("Error fetching Tenants:", error);
    throw new Error("Database error occurred while fetching Tenants.");
  } finally {
    conn.release();
  }
};

const getTenantByTenantId = async (tenant_id) => {
  const query = tenantQuery.getTenantByTenantId;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenant_id]);
    return rows[0];
  } catch (error) {
    throw new CustomError("Database error occurred while fetching the Tenant.",404);
  } finally {
    conn.release();
  }
};

const checkTenantExistsByTenantId = async (tenant_id) => {
  const query = 'select 1 from tenant where tenant_id=?'
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenant_id]);
    return rows.length > 0;
  } catch (error) {
    throw new CustomError("Database error occurred while fetching the Tenant.");
  } finally {
    conn.release();
  }
};

const checkTenantExistsByTenantnameAndTenantdomain = async (tenantName,tenantDomain) => {
  const query = 'select 1 from tenant where tenant_name=? and tenant_domain=?';
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantName,tenantDomain]);
    return rows.length > 0;
  } catch (error) {
    throw new CustomError("Database error occurred while fetching the Tenant.");
  } finally {
    conn.release();
  }
};

const getTenantByTenantNameAndTenantDomain = async (tenantName,tenantDomain) => {
  const query = 'select * from tenant where tenant_name=? and tenant_domain=?limit 1';
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(query, [tenantName,tenantDomain]);
    return rows[0];
  } catch (error) {
    throw new CustomError("Database error occurred while fetching the Tenant.");
  } finally {
    conn.release();
  }
};

const getUserIdUsingKeycloakId = async (table, keycloakId, tenantId, clinicId = null) => {
  const idColumn = `${table}_id`;

  if(table==='receptionist') table='reception'

  let query = `
    SELECT ?? AS userid,username
    FROM ?? 
    WHERE keycloak_id = ? AND tenant_id = ?
  `;

  const queryParams = [idColumn, table, keycloakId, tenantId];

  if (clinicId !== null) {
    query += ` AND clinic_id = ?`;
    queryParams.push(clinicId);
  }

  query += ` LIMIT 1`;

  const conn = await pool.getConnection();

  try {
    const rows = await conn.query(query, queryParams);
    console.log(rows)
    return rows[0];
  } catch (error) {
    console.error("Database error:", error.message);
    throw new CustomError("Database error occurred while fetching the UserId.");
  } finally {
    conn.release();
  }
};


const updateTenant = async (tenant_id, columns,values) => {
  try {
    const conditionColumn = ["tenant_id"];
    const conditionValue = [tenant_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating tenant:", error);
    throw new CustomError("Error updating tenant.", 500);
  }
};

// Delete Tenant in the Database
const deleteTenant = async (tenant_id) => {
  const query = tenantQuery.deleteTenantByTenantId; // Assume you have a delete query in your `tenantQuery.js`
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(query, [tenant_id]);
    return result.affectedRows; // Return the number of rows affected (should be 1 if successful)
  } catch (error) {
    console.error("Error deleting Tenant:", error.message);
    throw new CustomError("Database error occurred while deleting the Tenant.");
  } finally {
    conn.release();
  }
};

module.exports = {
  createTenant,
  getAllTenant,
  getTenantByTenantId,
  checkTenantExistsByTenantId,
  checkTenantExistsByTenantnameAndTenantdomain,
  updateTenant,
  deleteTenant,
  getTenantByTenantNameAndTenantDomain,
  getUserIdUsingKeycloakId
};
