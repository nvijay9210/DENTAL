const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "toothdetails";

// Create ToothDetails
const createToothDetails = async (table, columns, values) => {
  try {
    const toothdetails = await record.createRecord(table, columns, values);

    return toothdetails.insertId;
  } catch (error) {
    console.error("Error creating toothdetails:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all toothdetailss by tenant ID with pagination
const getAllToothDetailssByTenantId = async (tenantId, limit, offset) => {
  try {
    if (
      !Number.isInteger(limit) ||
      !Number.isInteger(offset) ||
      limit < 1 ||
      offset < 0
    ) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords(
      "toothdetails",
      "tenant_id",
      tenantId,
      limit,
      offset
    );
  } catch (error) {
    console.error("Error fetching toothdetailss:", error);
    throw new CustomError("Error fetching toothdetailss.", 500);
  }
};

const getAllToothDetailsByTenantAndClinicAndDentistAndPatientId = async (
  tenantId,
  clinicId,
  dentistId,
  patientId,
  limit,
  offset
) => {
  const query1 = `SELECT * FROM toothdetails  WHERE tenant_id = ? AND clinic_id = ? and dentist_id=? and patient_id=? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM toothdetails  WHERE tenant_id = ? AND clinic_id = ? and dentist_id=? and patient_id=?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      dentistId,
      patientId,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [
      tenantId,
      clinicId,
      dentistId,
      patientId,
    ]);
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAllToothDetailsByTenantAndClinicAndPatientId = async (
  tenantId,
  clinicId,
  patientId,
  limit,
  offset
) => {
  const query1 = `SELECT td.*,concat(d.first_name,' ',d.last_name) as dentist_name,c.clinic_name FROM toothdetails td JOIN dentist d on d.dentist_id=td.dentist_id JOIN clinic c on c.clinic_id=td.clinic_id  WHERE td.tenant_id = ? AND td.clinic_id = ? and td.patient_id=? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM toothdetails td JOIN dentist d on d.dentist_id=td.dentist_id JOIN clinic c on c.clinic_id=td.clinic_id  WHERE td.tenant_id = ? AND td.clinic_id = ? and td.patient_id=?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      patientId,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [
      tenantId,
      clinicId,
      patientId,
    ]);
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

// Get toothdetails by tenant ID and toothdetails ID
const getToothDetailsByTenantAndToothDetailsId = async (
  tenant_id,
  toothdetails_id
) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "toothdetails_id",
      toothdetails_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching toothdetails:", error);
    throw new CustomError("Error fetching toothdetails.", 500);
  }
};

// Update toothdetails
const updateToothDetails = async (
  toothdetails_id,
  columns,
  values,
  tenant_id
) => {
  try {
    const conditionColumn = ["tenant_id", "toothdetails_id"];
    const conditionValue = [tenant_id, toothdetails_id];

    return await record.updateRecord(
      TABLE,
      columns,
      values,
      conditionColumn,
      conditionValue
    );
  } catch (error) {
    console.error("Error updating toothdetails:", error);
    throw new CustomError("Error updating toothdetails.", 500);
  }
};

// Delete toothdetails
const deleteToothDetailsByTenantAndToothDetailsId = async (
  tenant_id,
  toothdetails_id
) => {
  try {
    const conditionColumn = ["tenant_id", "toothdetails_id"];
    const conditionValue = [tenant_id, toothdetails_id];

    const result = await record.deleteRecord(
      TABLE,
      conditionColumn,
      conditionValue
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting toothdetails:", error);
    throw new CustomError("Error deleting toothdetails.", 500);
  }
};

module.exports = {
  createToothDetails,
  getAllToothDetailssByTenantId,
  getToothDetailsByTenantAndToothDetailsId,
  updateToothDetails,
  deleteToothDetailsByTenantAndToothDetailsId,
  getAllToothDetailsByTenantAndClinicAndDentistAndPatientId,
  getAllToothDetailsByTenantAndClinicAndPatientId,
};
