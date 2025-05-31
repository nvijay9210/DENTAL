const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "prescription";

// Create Prescription
const createPrescription = async (table,columns, values) => {
  try {
    const prescription = await record.createRecord(table, columns, values);
    return prescription.insertId;
  } catch (error) {
    console.error("Error creating prescription:", error);
    throw new CustomError("Database Query Error", 500);
  }
};

// Get all prescriptions by tenant ID with pagination
const getAllPrescriptionsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords(TABLE, "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    throw new CustomError("Error fetching prescriptions.", 500);
  }
};

// Get prescription by tenant ID and prescription ID
const getPrescriptionByTenantAndPrescriptionId = async (tenant_id, prescription_id) => {
  try {
    const [rows] = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "prescription_id",
      prescription_id
    );
    return rows?.[0] ?? null;
  } catch (error) {
    console.error("Error fetching prescription:", error);
    throw new CustomError("Error fetching prescription.", 500);
  }
};

// Update prescription
const updatePrescription = async (prescription_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "prescription_id"];
    const conditionValue = [tenant_id, prescription_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating prescription:", error);
    throw new CustomError("Error updating prescription.", 500);
  }
};

// Delete prescription
const deletePrescriptionByTenantAndPrescriptionId = async (tenant_id, prescription_id) => {
  try {
    const conditionColumn = ["tenant_id", "prescription_id"];
    const conditionValue = [tenant_id, prescription_id];

    const [result] = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting prescription:", error);
    throw new CustomError("Error deleting prescription.", 500);
  }
};

const getAllPrescriptionsByTenantClinicAndDentistAndPatientId = async (tenantId,clinicId,dentistId, patientId,limit,offset) => {
  const query = `SELECT 
    p.patient_id,
     CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
     app.appointment_date,
     app.reason
FROM 
    prescription AS app
JOIN 
    patient as p 
ON
  p.patient_id=app.patient_id
WHERE 
    app.tenant_id = ? AND 
    app.clinic_id = ? AND 
    app.patient_id=? AND
    app.status='CP'
    limit ? offset ? 
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId,clinicId, patientId,limit,offset]);
    console.log('appoinments:',rows)
    return rows;
  } catch (error) {
    console.log(error);
    throw new Error("Database Query Error");
  } finally {
    conn.release();
  }
};

const getAllPrescriptionsByTenantAndPatientId = async (tenantId, patientId,treatment_id,limit,offset) => {
  const query = `SELECT *
FROM 
    prescription 
WHERE 
    tenant_id = ? AND 
    patient_id=? AND treatment_id=?
    limit ? offset ? 
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, patientId,treatment_id,limit,offset]);
    return rows;
  } catch (error) {
    console.log(error);
    throw new Error("Database Query Error");
  } finally {
    conn.release();
  }
};


module.exports = {
  createPrescription,
  getAllPrescriptionsByTenantId,
  getPrescriptionByTenantAndPrescriptionId,
  updatePrescription,
  deletePrescriptionByTenantAndPrescriptionId,
  getAllPrescriptionsByTenantAndPatientId
};
