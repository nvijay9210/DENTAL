const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "patient_clinic";

// Create PatientClinic
const createPatientClinic = async (table,columns, values) => {
  try {
    const patient_clinic = await record.createRecord(table, columns, values);
   
    return patient_clinic.insertId;
  } catch (error) {
    console.error("Error creating patient_clinic:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all patient_clinics by tenant ID with pagination
const getAllPatientClinicsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords("patient_clinic", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching patient_clinics:", error);
    throw new CustomError("Error fetching patient_clinics.", 500);
  }
};

// Get patient_clinic by tenant ID and patient_clinic ID
const getPatientClinicByTenantAndPatientClinicId = async (tenant_id, patient_clinic_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "patient_clinic_id",
      patient_clinic_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching patient_clinic:", error);
    throw new CustomError("Error fetching patient_clinic.", 500);
  }
};

// Update patient_clinic
const updatePatientClinic = async (patient_clinic_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "patient_clinic_id"];
    const conditionValue = [tenant_id, patient_clinic_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating patient_clinic:", error);
    throw new CustomError("Error updating patient_clinic.", 500);
  }
};

// Delete patient_clinic
const deletePatientClinicByTenantAndPatientClinicId = async (tenant_id, patient_clinic_id) => {
  try {
    const conditionColumn = ["tenant_id", "patient_clinic_id"];
    const conditionValue = [tenant_id, patient_clinic_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting patient_clinic:", error);
    throw new CustomError("Error deleting patient_clinic.", 500);
  }
};

const getAllPatientClinicsByTenantIdAndClinicId = async (tenantId,clinicId, limit, offset) => {
  const query1 = `SELECT * FROM patient_clinic  WHERE tenant_id = ? AND clinic_id = ? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM patient_clinic  WHERE tenant_id = ? AND clinic_id = ?`;
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
  createPatientClinic,
  getAllPatientClinicsByTenantId,
  getPatientClinicByTenantAndPatientClinicId,
  updatePatientClinic,
  deletePatientClinicByTenantAndPatientClinicId,
  getAllPatientClinicsByTenantIdAndClinicId
};
