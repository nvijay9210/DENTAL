const pool = require("../config/db");
const helper = require("../utils/Helpers");
const record = require("../query/Records");

const createDentist = async (table, columns, values) => {
  try {
    const dentist = await record.createRecord(table, columns, values);
    return dentist.insertId;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Database Operation Failed");
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
  const query = `select * from dentist where tenant_id=? and dentist_id=?`;
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(query, [tenant_id, dentist_id]);
    return rows[0][0];
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
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
    return result.affectedRows;
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
    throw new Error("Database Operation Failed");
  }
};

const getAllDentistsByTenantIdAndClinicId = async (tenantId, clinicId,limit,offset) => {
  const query1 = `SELECT * FROM dentist d join clinic c on c.clinic_id = d.clinic_id WHERE d.tenant_id = ? AND d.clinic_id = ? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM dentist d join clinic c on c.clinic_id = d.clinic_id WHERE d.tenant_id = ? AND d.clinic_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [tenantId, clinicId,limit,offset]);
    const [counts] = await conn.query(query2, [tenantId, clinicId]);
    return {data:rows,total:counts[0].total};
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
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
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
}

const updateClinicIdAndNameAndAddress=async(tenantId,clinicId,clinic_name,clinic_addrss,dentist_id)=>{
 
  const query = `update dentist set clinic_id=?, clinic_name=?, clinic_address=? where tenant_id=? and dentist_id=?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [clinicId,clinic_name,clinic_addrss,tenantId,dentist_id]);
    return rows.length > 0;
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
}

const updateDentistRatingAndReviewCount=async(tenantId,dentist_id,newRating,newReviewCount)=>{

  const query = `update dentist set ratings=?, reviews_count=?  where tenant_id=? and dentist_id=?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [newRating,newReviewCount,tenantId,dentist_id]);
    return rows.length > 0;
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
}

const updateNullClinicInfoWithJoin = async (tenantId, clinicId,dentistId) => {

  const query = `
    UPDATE dentist d
    JOIN clinic c ON d.clinic_id = c.clinic_id AND d.tenant_id = c.tenant_id
    SET 
      d.clinic_id = NULL,
      d.clinic_name = NULL,
      d.clinic_address = NULL
    WHERE 
      d.tenant_id = ? 
      AND d.dentist_id = ? 
      AND d.clinic_id = ?;
  `;

  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(query, [tenantId, dentistId, clinicId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error updating with join and clinic_id:", error);
    throw new Error("Database update failed");
  } finally {
    conn.release();
  }
};

const checkDentistExistsUsingTenantIdAndClinicIdAnddentistId = async (dentistId,tenantId, clinicId) => {
  const query = `
    SELECT 1
    FROM dentist
    WHERE dentist_id=? AND tenant_id = ? AND clinic_id = ? LIMIT 1
  `;

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.execute(query, [dentistId,tenantId, clinicId]);
    
    return rows.length>0;
  } catch (error) {
    console.error("Error in checkDentistExistsUsingTenantIdAndClinicIdAnddentistId:", error);
    throw new Error("DentistId Not Exists");
  } finally {
    conn.release();
  }
};

const updateDentistAppointmentCount = async (tenantId, clinicId,dentistId, assign = true) => {
  const modifier = assign ? 1 : -1;

  const query = `
    UPDATE dentist
    SET appointment_count = GREATEST(appointment_count + ?, 0)
    WHERE tenant_id = ? AND clinic_id=? AND dentist_id = ?;
  `;

  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(query, [modifier, tenantId, clinicId,dentistId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(`Error ${assign ? 'incrementing' : 'decrementing'} dentist appointment count:`, error);
    throw new Error(`Database Operation Failed while updating dentist appointment count`);
  } finally {
    conn.release();
  }
};



module.exports = {
  createDentist,
  getAllDentistsByTenantId,
  getDentistByTenantIdAndDentistId,
  updateDentist,
  deleteDentistByTenantIdAndDentistId,
  checkDentistExistsByTenantIdAndDentistId,
  getAllDentistsByTenantIdAndClinicId,
  updateClinicIdAndNameAndAddress,
  getAllDentistsByClinicId,
  updateNullClinicInfoWithJoin,
  checkDentistExistsUsingTenantIdAndClinicIdAnddentistId,
  updateDentistAppointmentCount,
  updateDentistRatingAndReviewCount
};
