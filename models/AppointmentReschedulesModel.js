const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "appointment_reschedules";

// Create AppointmentReschedules
const createAppointmentReschedules = async (table,columns, values) => {
  try {
    const appointment_reschedules = await record.createRecord(table, columns, values);
    return appointment_reschedules;
  } catch (error) {
    console.error("Error creating appointment_reschedules:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all appointment_rescheduless by tenant ID with pagination
const getAllAppointmentReschedulessByTenantId = async (tenantId, limit, offset) => {
  try {
    return await record.getAllRecords("appointment_reschedules", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching appointment_rescheduless:", error);
    throw new CustomError("Error fetching appointment_rescheduless.", 500);
  }
};
const getAllAppointmentReschedulessByTenantIdAndClinicId = async (tenantId,clinicId, limit, offset) => {
  const query = `SELECT * FROM appointment_reschedules WHERE tenant_id = ? AND clinic_id = ? limit ? offset ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, clinicId,limit,offset]);
    return rows;
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};
const getAllAppointmentReschedulessByTenantIdAndClinicIdAndDentistId = async (tenantId,clinicId,dentistId, limit, offset) => {
  const query = `SELECT * FROM appointment_reschedules WHERE tenant_id = ? AND clinic_id = ? AND dentist_id=? limit ? offset ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, clinicId,dentistId,limit,offset]);
    return rows;
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

// Get appointment_reschedules by tenant ID and appointment_reschedules ID
const getAppointmentReschedulesByTenantAndAppointmentReschedulesId = async (tenant_id, appointment_reschedules_id) => {
  try {
    const [rows] = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "appointment_reschedules_id",
      appointment_reschedules_id
    );
    return rows?.[0] ?? null;
  } catch (error) {
    console.error("Error fetching appointment_reschedules:", error);
    throw new CustomError("Error fetching appointment_reschedules.", 500);
  }
};

// Update appointment_reschedules
const updateAppointmentReschedules = async (appointment_reschedules_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "appointment_reschedules_id"];
    const conditionValue = [tenant_id, appointment_reschedules_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating appointment_reschedules:", error);
    throw new CustomError("Error updating appointment_reschedules.", 500);
  }
};

// Delete appointment_reschedules
const deleteAppointmentReschedulesByTenantAndAppointmentReschedulesId = async (tenant_id, appointment_reschedules_id) => {
  try {
    const conditionColumn = ["tenant_id", "appointment_reschedules_id"];
    const conditionValue = [tenant_id, appointment_reschedules_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting appointment_reschedules:", error);
    throw new CustomError("Error deleting appointment_reschedules.", 500);
  }
};



module.exports = {
  createAppointmentReschedules,
  getAllAppointmentReschedulessByTenantId,
  getAppointmentReschedulesByTenantAndAppointmentReschedulesId,
  updateAppointmentReschedules,
  deleteAppointmentReschedulesByTenantAndAppointmentReschedulesId,
  getAllAppointmentReschedulessByTenantIdAndClinicIdAndDentistId,
  getAllAppointmentReschedulessByTenantIdAndClinicId
};
