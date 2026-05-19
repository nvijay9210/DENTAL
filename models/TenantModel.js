const pool = require("../config/db");
const { tenantQuery } = require("../query/TenantQuery")

const record = require("../query/Records");
const { CustomError } = require("../middlewares/CustomeError");

const TABLE = "tenant";

const createTenant = async (table,columns, values) => {
  try {
    const tenant = await record.createRecord(table, columns, values);
    return tenant.insertId;
  } catch (error) {
    console.error("Error creating tenant:", error);
    throw error
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
    // console.log(tenant_id,rows)
    return rows[0];
  } catch (error) {
    throw error
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
    throw error
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
    throw error
  } finally {
    conn.release();
  }
};

const getTenantByTenantNameAndTenantDomain = async (tenantName,tenantDomain) => {
  const query = 'select * from tenant where tenant_name=? and tenant_domain=?limit 1';
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(query, [tenantName,tenantDomain]);
    return rows[0][0];
  } catch (error) {
    console.error(error.message)
    throw error
  } finally {
    conn.release();
  }
};

const getUserIdUsingKeycloakId = async (table, keycloakId, tenantId, clinicId = null) => {
  if (table === 'receptionist') table = 'reception';

  const idColumn = `${table}_id`;
  let selectColumn = 'username';

  // Always return "profile_picture" (alias if needed)
  if (['patient', 'dentist', 'reception','superuser'].includes(table)) {
    selectColumn += ', profile_picture';
  } else if (table === 'supplier') {
    selectColumn += ', logo_url AS profile_picture';
  }

  let query = `
    SELECT ?? AS userid, ${selectColumn}
    FROM ??
    WHERE keycloak_id = ? AND tenant_id = ?
  `;

  const queryParams = [idColumn, table, keycloakId, tenantId];

  if (table === 'dentist' || table === 'reception') {
    query += ` AND status = ?`;
    queryParams.push('1');
  }

  if (clinicId !== null && table !== 'patient') {
    query += ` AND clinic_id = ?`;
    queryParams.push(clinicId);
  }

  query += ` LIMIT 1`;

  const conn = await pool.getConnection();

  try {
 
    const rows = await conn.query(query, queryParams);
    return rows[0][0];
  } catch (error) {
    console.error("Database error:", error.message);
    throw error;
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
    throw error
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
    throw error
  } finally {
    conn.release();
  }
};

const getAllTenantIds = async () => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT tenant_id 
      FROM tenant
    `);
    return rows.map(row => row.tenant_id);
  } catch (err) {
    console.error("❌ Error fetching tenant IDs:", err);
    return [];
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
  getUserIdUsingKeycloakId,
  getAllTenantIds
};
