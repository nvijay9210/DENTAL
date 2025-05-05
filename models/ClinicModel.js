const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const helper = require('../utils/Helpers');
const record = require('../query/Records');

// Create Clinic
const createClinic = async (table, columns, values) => {
  try {
    const clinic = await record.createRecord(table, columns, values);
    return clinic.insertId;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error('Database Query Error');
  }
};

// Get All Clinics by Tenant ID
const getAllClinicsByTenantId = async (tenantId, limit, offset) => {
  try {
    const clinics = await record.getAllRecords('clinic', 'tenant_id', tenantId, limit, offset);
    return clinics;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error fetching clinics.");
  }
};

// Get Clinic by Tenant ID and Clinic ID
const getClinicByTenantIdAndClinicId = async (tenant_id, clinic_id) => {
  try {
    const [rows] = await record.getRecordByIdAndTenantId('clinic', 'tenant_id', tenant_id, 'clinic_id', clinic_id);
    return rows[0] || null;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error fetching clinic.");
  }
};

// Update Clinic
const updateClinic = async (clinic_id, columns, values, tenant_id) => {
  const conditionColumn = ['tenant_id', 'clinic_id'];
  const conditionValue = [tenant_id, clinic_id];

  try {
    const result = await record.updateRecord('clinic', columns, values, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error(error);
  }
};

// Delete Clinic
const deleteClinicByTenantIdAndClinicId = async (tenant_id, clinic_id) => {
  const conditionColumn = ['tenant_id', 'clinic_id'];
  const conditionValue = [tenant_id, clinic_id];
  helper.sameLengthChecker(conditionColumn, conditionValue);

  try {
    const result = await record.deleteRecord('clinic', conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error deleting clinic.");
  }
};

// Check if Clinic Exists
const checkClinicExistsByTenantIdAndClinicId = async (tenantId, clinicId) => {
  const query = `SELECT 1 FROM clinic WHERE tenant_id = ? AND clinic_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, clinicId]);
    return rows.length > 0;
  } catch (error) {
    console.error(error);
    throw new Error("Database Query Error");
  } finally {
    conn.release();
  }
};

module.exports = {
  createClinic,
  getAllClinicsByTenantId,
  getClinicByTenantIdAndClinicId,
  updateClinic,
  deleteClinicByTenantIdAndClinicId,
  checkClinicExistsByTenantIdAndClinicId
};
