const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const helper = require("../utils/Helpers");
const record = require("../query/Records");

const TABLE = "treatment";

// Create Treatment
const createTreatment = async (table,columns, values) => {
  try {
    await helper.sameLengthChecker(columns, values);
    const treatment = await record.createRecord(table, columns, values);
    return treatment.insertId;
  } catch (error) {
    console.error("Error creating treatment:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all treatments by tenant ID with pagination
const getAllTreatmentsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords(TABLE, "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching treatments:", error);
    throw new CustomError("Error fetching treatments.", 500);
  }
};

// Get treatment by tenant ID and treatment ID
const getTreatmentByTenantAndTreatmentId = async (tenant_id, treatment_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "treatment_id",
      treatment_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching treatment:", error);
    throw new CustomError("Error fetching treatment.", 500);
  }
};

const getAllTreatmentsByTenantAndClinicId = async (tenantId,clinic_id,appointment_id,limit,offset) => {
  const query1 = `SELECT *
FROM 
    treatment 
WHERE 
    tenant_id = ? AND 
    clinic_id=? AND
    appointment_id=?
    limit ? offset ? 
`;
  const query2 = `SELECT COUNT(*) AS total
FROM 
    treatment 
WHERE 
    tenant_id = ? AND 
    clinic_id=? AND
    appointment_id=?
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [tenantId,clinic_id,appointment_id,limit,offset]);
    const [counts] = await conn.query(query2, [tenantId,clinic_id,appointment_id]);
    return {data:rows,total:counts[0].total};
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAllTreatmentsByTenantAndClinicIdAndDentist = async (tenantId,clinic_id,dentist_id,appointment_id,limit,offset) => {
  const query1 = `SELECT *
FROM 
    treatment 
WHERE 
    tenant_id = ? AND 
    clinic_id=? AND
    dentist_id=? AND
    appointment_id=?
    limit ? offset ? 
`;
  const query2 = `SELECT COUNT (*) AS total
FROM 
    treatment 
WHERE 
    tenant_id = ? AND 
    clinic_id=? AND
    dentist_id=? AND
    appointment_id=?
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [tenantId,clinic_id,dentist_id, appointment_id,limit,offset]);
    const [counts] = await conn.query(query2, [tenantId,clinic_id,dentist_id, appointment_id]);
    return {data:rows,total:counts[0].total};
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAllTreatmentsByTenantAndDentistId = async (tenantId,dentist_id,limit,offset) => {
  const query1 = `SELECT *
FROM 
    treatment 
WHERE 
    tenant_id = ? AND
    dentist_id=?
    limit ? offset ? 
`;
  const query2 = `SELECT COUNT (*) AS total
FROM 
    treatment 
WHERE 
    tenant_id = ? AND
    dentist_id=? 
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [tenantId,dentist_id, limit,offset]);
    const [counts] = await conn.query(query2, [tenantId,dentist_id]);
    return {data:rows,total:counts[0].total};
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAllTreatmentsByTenantAndPatientId = async (tenantId,patient_id,limit,offset) => {
  const query1 = `SELECT *
FROM 
    treatment 
WHERE 
    tenant_id = ? AND 
    patient_id=?
    limit ? offset ? 
`;
  const query2 = `SELECT COUNT (*) AS total
FROM 
    treatment 
WHERE 
    tenant_id = ? AND 
    patient_id=?
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [tenantId,patient_id, limit,offset]);
    const [counts] = await conn.query(query2, [tenantId,patient_id]);
    return {data:rows,total:counts[0].total};
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

// Update treatment
const updateTreatment = async (treatment_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "treatment_id"];
    const conditionValue = [tenant_id, treatment_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating treatment:", error);
    throw new CustomError("Error updating treatment.", 500);
  }
};

// Delete treatment
const deleteTreatmentByTenantAndTreatmentId = async (tenant_id, treatment_id) => {
  try {
    const conditionColumn = ["tenant_id", "treatment_id"];
    const conditionValue = [tenant_id, treatment_id];

    const [result] = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    console.log(result)
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting treatment:", error);
    throw new CustomError("Error deleting treatment.", 500);
  }
};



module.exports = {
  createTreatment,
  getAllTreatmentsByTenantId,
  getTreatmentByTenantAndTreatmentId,
  updateTreatment,
  deleteTreatmentByTenantAndTreatmentId,
  getAllTreatmentsByTenantAndClinicId,
  getAllTreatmentsByTenantAndClinicIdAndDentist,
  getAllTreatmentsByTenantAndDentistId,
  getAllTreatmentsByTenantAndPatientId
};
