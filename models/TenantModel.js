const pool = require("../config/db");
const { tenantQuery } = require("../query/TenantQuery");

const createTenant = async (data) => {
  const query = tenantQuery.addTenant;
  const values=[data.tenant_name,data.tenant_domain,data.created_by]

  const conn = await pool.getConnection();
  console.log(data)
  try {
   const tenant= await conn.query(query,values);
   console.log(tenant[0].insertId)
   return tenant[0].insertId;
  } catch (error) {
    throw new Error("Database error occurred while creating the Tenant");
  } finally {
    conn.release();
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
    throw new CustomeError("Database error occurred while fetching the Tenant.",404);
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
    throw new CustomeError("Database error occurred while fetching the Tenant.");
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
    throw new CustomeError("Database error occurred while fetching the Tenant.");
  } finally {
    conn.release();
  }
};


const updateTenant = async (tenant_id, data) => {
  const query = tenantQuery.updateTenant;
  const conn = await pool.getConnection();
  try {
    const { tenant_name,tenant_domain,updated_by } = data;
    const [result] = await conn.query(query, [tenant_name,tenant_domain,updated_by, tenant_id]);
    return result.affectedRows; // Return the number of rows affected (should be 1 if successful)
  } catch (error) {
    console.error("Error updating Tenant:", error.message);
    throw new CustomeError("Database error occurred while updating the Tenant.");
  } finally {
    conn.release();
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
    throw new CustomeError("Database error occurred while deleting the Tenant.");
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
};
