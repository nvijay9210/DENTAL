const pool = require("../config/db");
const record = require('../query/Records');

// Assuming Helper method for column/value length match
const validateColumnValueLengthMatch = (columns, values) => {
  if (columns.length !== values.length) {
    throw new Error("Columns and values do not match in length.");
  }
};

const createPatient = async (table, columns, values) => {
  try {
    validateColumnValueLengthMatch(columns, values);
    const patient = await record.createRecord(table, columns, values);
    return patient.insertId;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error('Database Query Error');
  }
};

const getAllPatientsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (limit < 1 || offset < 0) throw new Error("Invalid pagination parameters.");
    const patients = await record.getAllRecords('patient', 'tenant_id', tenantId, limit, offset);
    return patients;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error fetching patients.");
  }
};

const getPatientByTenantIdAndPatientId = async (tenant_id, patient_id) => {
  try {
    const [rows] = await record.getRecordByIdAndTenantId('patient', 'tenant_id', tenant_id, 'patient_id', patient_id);
    return rows[0] || null;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error fetching patient.");
  }
};

const updatePatient = async (patient_id, columns, values, tenant_id) => {
  const conditionColumn = ['tenant_id', 'patient_id'];
  const conditionValue = [tenant_id, patient_id];

  try {
    const result = await record.updateRecord('patient', columns, values, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error(error);
  }
};

const deletePatientByTenantIdAndPatientId = async (tenant_id, patient_id) => {
  const conditionColumn = ['tenant_id', 'patient_id'];
  const conditionValue = [tenant_id, patient_id];

  try {
    const result = await record.deleteRecord('patient', conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error deleting patient.");
  }
};

const checkPatientExistsByTenantIdAndPatientId = async (tenantId, patientId) => {
  const query = `SELECT EXISTS(SELECT 1 FROM patient WHERE tenant_id = ? AND patient_id = ?) AS \`exists\``;
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(query, [tenantId, patientId]);
    return Boolean(rows[0].exists); // Ensure consistent return type (true/false)
  } catch (error) {
    console.error("Error checking patient existence:", error);
    throw new Error("Database Query Error");
  } finally {
    conn.release();
  }
};

const updateToothDetails = async (data,patientId,tenantId) => {
  console.log(data,patientId,tenantId)
  const query = 'update patient set tooth_details=? where patient_id=? and tenant_id';
  const conn = await pool.getConnection();

  try {
    const rows = await conn.query(query, [data,patientId,tenantId]);
    return rows[0].affectedRows// Ensure consistent return type (true/false)
  } catch (error) {
    console.error("Error checking patient existence:", error);
    throw new Error("Database Query Error");
  } finally {
    conn.release();
  }
};

const updatePatientAppointmentCount = async (tenantId, patientId, assign = true) => {
  const modifier = assign ? 1 : -1;

  const query = `
    UPDATE patient
    SET appointment_count = GREATEST(appointment_count + ?, 0)
    WHERE tenant_id = ? AND patient_id = ?;
  `;

  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(query, [modifier, tenantId, patientId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error updating appointment count:", error);
    throw new Error(`Database Query Error while ${assign ? 'incrementing' : 'decrementing'} appointment count`);
  } finally {
    conn.release();
  }
};

const getPeriodSummaryByPatient = async (tenantId, clinicId, dentistId) => {
  const query = `
    SELECT 
      CONCAT(p.first_name, ' ', p.last_name) AS name,
      p.created_time
    FROM 
      patient p
    INNER JOIN appointment app 
      ON p.patient_id = app.patient_id
    WHERE 
      app.tenant_id = ? AND
      app.clinic_id = ? AND
      app.dentist_id = ? AND 
      p.appointment_count>0
    GROUP BY 
      p.patient_id, p.first_name, p.last_name, p.created_time
  `;

  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(query, [tenantId, clinicId, dentistId]);
    return rows; // Returns list of { name, created_time }
  } catch (error) {
    console.error("Error fetching patient summary:", error);
    throw new Error("Database Query Error");
  } finally {
    conn.release();
  }
};

const getAppointmentsForAnalytics = async (tenantId, clinicId, dentistId) => {
  const query = `
    SELECT
      a.appointment_id,
      a.patient_id,
      CONCAT(p.first_name, ' ', p.last_name) AS name,
      a.appointment_date,
      a.created_time
    FROM
      appointment a
    JOIN
      patient p ON a.patient_id = p.patient_id
    WHERE
      a.tenant_id = ?
      AND a.clinic_id = ?
      AND a.dentist_id = ?
  `;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, clinicId, dentistId]);
    return rows;
  } finally {
    conn.release();
  }
};

const groupToothProceduresByTimeRangeCumulative = async (tenantId, clinicId) => {
  const query = `
    SELECT
      p.tooth_details
    FROM
      appointment a
    JOIN
      patient p ON a.patient_id = p.patient_id
    WHERE
      a.tenant_id = ?
      AND a.clinic_id = ?
  `;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, clinicId]);
    return rows;
  } finally {
    conn.release();
  }
};

const groupToothProceduresByTimeRangeCumulativeByDentist = async (tenantId, clinicId,dentistId) => {
  const query = `
    SELECT
      p.tooth_details
    FROM
      appointment a
    JOIN
      patient p ON a.patient_id = p.patient_id
    WHERE
      a.tenant_id = ?
      AND a.clinic_id = ?
      AND a.dentist_id=?
  `;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, clinicId,dentistId]);
    return rows;
  } finally {
    conn.release();
  }
};



module.exports = {
  createPatient,
  getAllPatientsByTenantId,
  getPatientByTenantIdAndPatientId,
  updatePatient,
  deletePatientByTenantIdAndPatientId,
  checkPatientExistsByTenantIdAndPatientId,
  updateToothDetails,
  getPeriodSummaryByPatient,
  updatePatientAppointmentCount,
  getAppointmentsForAnalytics,
  groupToothProceduresByTimeRangeCumulative,
  groupToothProceduresByTimeRangeCumulativeByDentist
};
