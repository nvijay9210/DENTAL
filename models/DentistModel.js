const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const { dentistQuery } = require("../query/DentistQuery");
const helper = require("../utils/Helpers");
const record = require("../query/Records");

// Assuming Helper method for column/value length match
const validateColumnValueLengthMatch = (columns, values) => {
  if (columns.length !== values.length) {
    throw new Error("Columns and values do not match in length.");
  }
};

const createDentist = async (table, columns, values) => {
  try {
    validateColumnValueLengthMatch(columns, values);
    const dentist = await record.createRecord(table, columns, values);
    return dentist.insertId;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Database Query Error");
  }
};

const getAllDentistsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (limit < 1 || offset < 0)
      throw new Error("Invalid pagination parameters.");
    const dentists = await record.getAllRecords(
      "dentist",
      "tenant_id",
      tenantId,
      limit,
      offset
    );
    return dentists;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error fetching dentists.");
  }
};

const getDentistByTenantIdAndDentistId = async (tenant_id, dentist_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      "dentist",
      "tenant_id",
      tenant_id,
      "dentist_id",
      dentist_id
    );

    return rows || null;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error fetching dentist.");
  }
};

const updateDentist = async (dentist_id, columns, values, tenant_id) => {
  const conditionColumn = ["tenant_id", "dentist_id"];
  const conditionValue = [tenant_id, dentist_id];

  try {
    const result = await record.updateRecord(
      "dentist",
      columns,
      values,
      conditionColumn,
      conditionValue
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error(error);
  }
};

const deleteDentistByTenantIdAndDentistId = async (tenant_id, dentist_id) => {
  const conditionColumn = ["tenant_id", "dentist_id"];
  const conditionValue = [tenant_id, dentist_id];
  try {
    helper.sameLengthChecker(conditionColumn, conditionValue);
    const result = await record.deleteRecord(
      "dentist",
      conditionColumn,
      conditionValue
    );
    return result[0].affectedRows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error deleting dentist.");
  }
};

const checkDentistExistsByTenantIdAndDentistId = async (
  tenantId,
  dentistId
) => {
  const columns = { tenant_id: tenantId, dentist_id: dentistId };
  try {
    return await record.recordExists("dentist", columns);
  } catch (error) {
    console.log(error);
    throw new Error("Database Query Error");
  }
};

const getAllDentistsByTenantIdAndClinicId = async (tenantId, clinicId,limit,offset) => {
  const query = `SELECT CONCAT(d.first_name, ' ', d.last_name) AS patient_name,specialization FROM dentist d join clinic c on c.tenant_id = d.tenant_id WHERE d.tenant_id = ? AND c.clinic_id = ? limit=? offset=?`;
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

const getAllDentistsByClinicId=async(tenantId,clinicId)=>{
  const query = `select concat(first_name,'',last_name) as name,specialization  where tenant_id=? and clinic_id=?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId,clinicId]);
    return rows.length > 0;
  } catch (error) {
    console.error(error);
    throw new Error("Database Query Error");
  } finally {
    conn.release();
  }
}

const updateClinicIdAndNameAndAddress=async(tenantId,clinicId,clinic_name,clinic_addrss,dentist_id)=>{
  const query = `update dentist set clinic_id=?, clinic_name=?, clinic_address=? where tenant_id=? and dentist_id=?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId,clinicId,clinic_name,clinic_addrss,dentist_id]);
    return rows.length > 0;
  } catch (error) {
    console.error(error);
    throw new Error("Database Query Error");
  } finally {
    conn.release();
  }
}


module.exports = {
  createDentist,
  getAllDentistsByTenantId,
  getDentistByTenantIdAndDentistId,
  updateDentist,
  deleteDentistByTenantIdAndDentistId,
  checkDentistExistsByTenantIdAndDentistId,
  getAllDentistsByTenantIdAndClinicId,
  updateClinicIdAndNameAndAddress,
  getAllDentistsByClinicId
};
