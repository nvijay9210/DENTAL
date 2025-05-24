const pool = require("../config/db");
const helper = require("../utils/Helpers");
const record = require("../query/Records");

// Assuming Helper method for column/value length match
const validateColumnValueLengthMatch = (columns, values) => {
  if (columns.length !== values.length) {
    throw new Error("Columns and values do not match in length.");
  }
};

const createAppointment = async (table, columns, values) => {
  try {
    validateColumnValueLengthMatch(columns, values);
    const appointment = await record.createRecord(table, columns, values);
    return appointment.insertId;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Database Query Error");
  }
};

const getAllAppointmentsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (limit < 1 || offset < 0)
      throw new Error("Invalid pagination parameters.");
    const appointments = await record.getAllRecords(
      "appointment",
      "tenant_id",
      tenantId,
      limit,
      offset
    );
    return appointments;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error fetching appointments.");
  }
};

const getAppointmentByTenantIdAndAppointmentId = async (
  tenant_id,
  appointment_id
) => {
  try {
    const [rows] = await record.getRecordByIdAndTenantId(
      "appointment",
      "tenant_id",
      tenant_id,
      "appointment_id",
      appointment_id
    );
    return rows[0] || null;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error fetching appointment.");
  }
};

const updateAppointment = async (
  appointment_id,
  columns,
  values,
  tenant_id
) => {
  const conditionColumn = ["tenant_id", "appointment_id"];
  const conditionValue = [tenant_id, appointment_id];

  try {
    const result = await record.updateRecord(
      "appointment",
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

const deleteAppointmentByTenantIdAndAppointmentId = async (
  tenant_id,
  appointment_id
) => {
  const conditionColumn = ["tenant_id", "appointment_id"];
  const conditionValue = [tenant_id, appointment_id];
  helper.validateColumnValueLengthMatch(conditionColumn, conditionValue);

  try {
    const [result] = await record.deleteRecord(
      "appointment",
      conditionColumn,
      conditionValue
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error deleting appointment.");
  }
};

const checkAppointmentExistsByStartTimeAndEndTimeAndDate = async (
  details,
  appointment_id = null
) => {
  const conn = await pool.getConnection();
  try {
    let query = `
        SELECT EXISTS (
          SELECT 1
          FROM appointment
          WHERE appointment_date = ?
            AND clinic_id = ?
            AND patient_id = ?
            AND dentist_id = ?
            AND tenant_id = ?
            AND NOT (
              ? >= end_time OR ? <= start_time
            )
      `;

    let params = [
      details.appointment_date,
      details.clinic_id,
      details.patient_id,
      details.dentist_id,
      details.tenant_id,
      details.start_time,
      details.end_time,
    ];

    // Exclude current appointment if we're updating
    if (appointment_id) {
      query += ` AND appointment_id <> ? `;
      params.push(appointment_id);
    }

    query += `) AS \`exists\``; // 👈 Escaped alias fixes the syntax error

    const [rows] = await conn.query(query, params);

    return rows[0]["exists"] === 1;
  } catch (error) {
    console.error("Error checking overlapping appointments:", error);
    throw new Error("Database Query Error");
  } finally {
    conn.release();
  }
};

const getAppointmentsWithDetails = async (tenantId, clinic_id, dentist_id,limit,offset) => {
  const query = `SELECT 
  CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
  p.profile_picture,
  p.gender,
  p.date_of_birth,
  app.status,
  p.patient_id,
  app.visit_reason,
  app.appointment_id,
  app.appointment_date,
  app.start_time,
  app.end_time
FROM appointment AS app
JOIN patient AS p ON p.patient_id = app.patient_id
WHERE app.tenant_id = ? 
  AND app.clinic_id = ? 
  AND app.dentist_id = ?
  limit ? offset ?;
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, clinic_id, dentist_id,limit,offset]);
    console.log('appoinments:',rows)
    return rows;
  } catch (error) {
    console.log(error);
    throw new Error("Database Query Error");
  } finally {
    conn.release();
  }
};

const getAppointmentMonthlySummary = async (tenantId, clinic_id, dentist_id) => {
  const query = `SELECT 
    COUNT(*) AS total_appointments,
    SUM(CASE WHEN app.status = 'CP' THEN 1 ELSE 0 END) AS completed_appointments,
    SUM(CASE WHEN app.status = 'SCH' THEN 1 ELSE 0 END) AS pending_appointments,
    SUM(CASE WHEN app.status = 'CL' THEN 1 ELSE 0 END) AS cancelled_appointments
FROM 
    appointment AS app
WHERE 
    app.tenant_id = ? 
    AND app.clinic_id = ? 
    AND app.dentist_id = ?
    AND app.appointment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
    AND app.appointment_date < DATE_FORMAT(CURDATE() + INTERVAL 1 MONTH, '%Y-%m-01');

`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, clinic_id, dentist_id]);
    console.log('appoinments:',rows)
    return rows;
  } catch (error) {
    console.log(error);
    throw new Error("Database Query Error");
  } finally {
    conn.release();
  }
};

const getPatientVisitDetailsByPatientIdAndTenantIdAndClinicId = async (tenantId,clinicId, patientId,limit,offset) => {
  const query = `SELECT 
    p.patient_id,
     CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
     app.appointment_date,
     app.reason
FROM 
    appointment AS app
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

const updateAppoinmentStatusCancelled = async (appointment_id,tenantId,clinicId) => {
  const query = `UPDATE appointment 
    SET 
      status='CL'
    WHERE 
    appointment_id=? 
      AND tenant_id = ?  
      AND clinic_id = ?
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [appointment_id,tenantId,clinicId, patientId]);
    console.log('appoinments:',rows)
    return rows.affectedRows > 0;
  } catch (error) {
    console.log(error);
    throw new Error("Database Query Error");
  } finally {
    conn.release();
  }
};

module.exports = {
  createAppointment,
  getAllAppointmentsByTenantId,
  getAppointmentByTenantIdAndAppointmentId,
  updateAppointment,
  deleteAppointmentByTenantIdAndAppointmentId,
  checkAppointmentExistsByStartTimeAndEndTimeAndDate,
  getAppointmentsWithDetails,
  getAppointmentMonthlySummary,
  getPatientVisitDetailsByPatientIdAndTenantIdAndClinicId,
  updateAppoinmentStatusCancelled
};
