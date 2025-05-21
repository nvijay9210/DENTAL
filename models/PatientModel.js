const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const { patientQuery } = require("../query/PatientQuery");
const helper = require('../utils/Helpers');
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
    return result[0].affectedRows;
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


module.exports = {
  createPatient,
  getAllPatientsByTenantId,
  getPatientByTenantIdAndPatientId,
  updatePatient,
  deletePatientByTenantIdAndPatientId,
  checkPatientExistsByTenantIdAndPatientId,
  updateToothDetails
};
