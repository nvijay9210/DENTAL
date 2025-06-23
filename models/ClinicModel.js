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
    throw new Error('Database Operation Failed');
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
    const rows = await record.getRecordByIdAndTenantId('clinic', 'tenant_id', tenant_id, 'clinic_id', clinic_id);
    console.log(rows)
    return rows || null;
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
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getClinicNameAndAddressByClinicId=async(tenantId,clinicId)=>{
  const query = `select clinic_id,clinic_name,address from clinic where tenant_id=? and clinic_id=? limit 1`;
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(query, [tenantId, clinicId]);
    return rows[0][0];
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
}


const updateDoctorCount = async (tenantId, clinicId, assign = 'true') => {
  const modifier = assign == 'false' 
    ? 'GREATEST(total_doctors - 1, 0)' 
    : 'total_doctors + 1';

  const query = `UPDATE clinic SET total_doctors = ${modifier} WHERE tenant_id = ? AND clinic_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(query, [tenantId, clinicId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(error);
    throw new Error(`Database Operation Failed while ${assign?'creat':'updat'}ing doctor count`);
  } finally {
    conn.release();
  }
};

const updatePatientCount = async (tenantId, clinicId, assign = true) => {
  const modifier = assign === false 
    ? 'GREATEST(total_patients - 1, 0)' 
    : 'total_patients + 1';

  const query = `UPDATE clinic SET total_patients = ${modifier} WHERE tenant_id = ? AND clinic_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(query, [tenantId, clinicId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(error);
    throw new Error(`Database Operation Failed while ${assign?'creat':'updat'}ing patient count`);
  } finally {
    conn.release();
  }
};

const getFinanceSummary=async(tenant_id,clinic_id)=>{
  const conn = await pool.getConnection();

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize current date

  // Fetch raw data
  let [appointments, treatments, expenses] = await Promise.all([
     conn.query(
          `SELECT appointment_date AS date, (consultation_fee - discount_applied) AS amount FROM appointment 
           WHERE status = 'CP' AND appointment_date >= ? AND tenant_id = ? AND clinic_id = ?`,
          [
            new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000),
            tenant_id,
            clinic_id,
            
          ]
        ),
     conn.query(
          `SELECT treatment_date AS date, cost AS amount FROM treatment 
           WHERE treatment_date >= ? AND tenant_id = ? AND clinic_id = ?`,
          [
            new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000),
            tenant_id,
            clinic_id,
            
          ]
        ),
    conn.query(
      `SELECT e.expense_date AS date, e.expense_amount AS amount
       FROM expense e
       WHERE e.expense_date >= ? AND e.tenant_id = ? AND e.clinic_id = ?`,
      [
        new Date(now.getFullYear() - 4, now.getMonth(), now.getDate()),
        tenant_id,
        clinic_id,
      ]
    ),
  ]);

  appointments = appointments[0];
  treatments = treatments[0];
  expenses = expenses[0];

  return {appointments,treatments,expenses}
}

const getFinanceSummarybyDentist=async(tenant_id,clinic_id,dentist_id)=>{
  const conn = await pool.getConnection();

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize current date

  // Fetch raw data
  let [appointments, treatments, expenses] = await Promise.all([
     conn.query(
          `SELECT appointment_date AS date, (consultation_fee - discount_applied) AS amount FROM appointment 
           WHERE status = 'CP' AND appointment_date >= ? AND tenant_id = ? AND clinic_id = ? AND dentist_id=?`,
          [
            new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000),
            tenant_id,
            clinic_id,
            dentist_id
          ]
        ),
     conn.query(
          `SELECT treatment_date AS date, cost AS amount FROM treatment 
           WHERE treatment_date >= ? AND tenant_id = ? AND clinic_id = ? AND dentist_id=?`,
          [
            new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000),
            tenant_id,
            clinic_id,
            dentist_id
          ]
        ),
    conn.query(
      `SELECT e.expense_date AS date, e.expense_amount AS amount
         FROM expense e
         WHERE e.expense_date >= ? AND e.tenant_id = ? AND e.clinic_id = ?`,
      [
        new Date(now.getFullYear() - 4, now.getMonth(), now.getDate()),
        tenant_id,
        clinic_id,
      ]
    ),
  ]);

  appointments = appointments[0];
  treatments = treatments[0];
  expenses = expenses[0];

  return {appointments,treatments,expenses}
}

const getClinicSettingsByTenantIdAndClinicId=async(tenantId,clinicId)=>{
  const query = `select clinic_name,clinic_logo,clinic_app_themes,clinic_app_font from clinic  where tenant_id=? and clinic_id=?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId,clinicId]);
    return rows[0];
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
}

const updateClinicSettings = async (tenantId, clinicId,details) => {

  const query = `
    UPDATE clinic
    SET clinic_name=?,clinic_logo=?,clinic_app_font=?,clinic_app_themes=?
    WHERE tenant_id = ? AND clinic_id=?;
  `;

  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(query, [details.clinic_name,details.clinic_logo,details.clinic_app_font,details.clinic_app_themes, tenantId, clinicId]);
    return result.affectedRows > 0;
  } catch (error) {
    throw new Error(`Database Operation Failed while updating clinic settings`);
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
  checkClinicExistsByTenantIdAndClinicId,
  getClinicNameAndAddressByClinicId,
  updateDoctorCount,
  updatePatientCount,
  getFinanceSummary,
  getFinanceSummarybyDentist,
  getClinicSettingsByTenantIdAndClinicId,
  updateClinicSettings
};
