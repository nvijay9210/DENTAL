const pool = require("../config/db");
const helper = require("../utils/Helpers");
const record = require("../query/Records");

const { v4: uuidv4 } = require("uuid");

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
    throw new Error("Database Operation Failed");
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

const getAllAppointmentsByTenantIdAndClinicId = async (
  tenantId,
  clinicId,
  limit,
  offset
) => {
  const query1 = `SELECT 
    *
FROM 
    appointment AS app
WHERE 
    app.tenant_id = ? 
    AND app.clinic_id = ? 
    limit ? offset ?

`;
  const query2 = `SELECT 
    COUNT(*) as total
FROM 
    appointment AS app
WHERE 
    app.tenant_id = ? 
    AND app.clinic_id = ? 

`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      limit,
      offset,
    ]);
    const [count] = await conn.query(query2, [tenantId, clinicId]);
    
    return { data: rows, total: count[0].total };
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAllAppointmentsByTenantIdAndClinicIdByDentist = async (
  tenantId,
  clinicId,
  dentist_id,
  limit,
  offset
) => {
  const query1 = `SELECT 
    *
FROM 
    appointment AS app
WHERE 
    app.tenant_id = ? 
    AND app.clinic_id = ? 
    AND app.dentist_id=?
    limit ? offset ?`;

  const query2 = `SELECT 
    COUNT(*) AS total
FROM 
    appointment AS app
WHERE 
    app.tenant_id = ? 
    AND app.clinic_id = ? 
    AND app.dentist_id=?
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      dentist_id,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [tenantId, clinicId, dentist_id]);

    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAllAppointmentsByTenantIdAndClinicIdAndDentistId = async (
  tenantId,
  clinicId,
  dentistId,
  limit,
  offset
) => {
  const query1 = `SELECT 
    app.appointment_date
FROM 
    appointment AS app
WHERE 
    app.tenant_id = ? 
    AND app.clinic_id = ? 
    AND app.dentist_id = ?
    limit ? offset ?
`;
  const query2 = `SELECT 
    COUNT(*) AS total
FROM 
    appointment AS app
WHERE 
    app.tenant_id = ? 
    AND app.clinic_id = ? 
    AND app.dentist_id = ?
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      dentistId,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [
      tenantId,
      clinicId,
      dentistId,
      limit,
      offset,
    ]);
    
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAllRoomIdByTenantIdAndClinicIdAndDentistId = async (
  tenantId,
  clinicId,
  dentistId
) => {
  const query = `SELECT 
    app.appointment_id,
    app.room_id
FROM 
    appointment AS app
WHERE 
    app.tenant_id = ? 
    AND app.clinic_id = ? 
    AND app.dentist_id = ?
    AND app.room_id!=?
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [
      tenantId,
      clinicId,
      dentistId,
      "00000000-0000-0000-0000-000000000000",
    ]);
    return rows;
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAllRoomIdByTenantIdAndClinicIdAndPatientId = async (
  tenantId,
  clinicId,
  patient_id
) => {
  const query = `SELECT 
    app.appointment_id,
    app.room_id
FROM 
    appointment AS app
WHERE 
    app.tenant_id = ? 
    AND app.clinic_id = ? 
    AND app.patient_id = ?
    AND app.room_id!=?
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [
      tenantId,
      clinicId,
      patient_id,
      "00000000-0000-0000-0000-000000000000",
    ]);
    return rows;
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAllAppointmentsByTenantIdAndDentistId = async (
  tenantId,
  dentistId,
  limit,
  offset
) => {
  const query1 = `SELECT 
    *
FROM 
    appointment AS app
WHERE 
    app.tenant_id = ? 
    AND app.dentist_id = ?
    limit ? offset ?
`;
  const query2 = `SELECT 
    COUNT(*) as total
FROM 
    appointment AS app
WHERE 
    app.tenant_id = ? 
    AND app.dentist_id = ?
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      dentistId,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [tenantId, dentistId]);
  
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAllAppointmentsByTenantIdAndPatientId = async (
  tenantId,
  patient_id,
  limit,
  offset
) => {
  const query1 = `SELECT 
   *
FROM 
    appointment AS app
WHERE 
    app.tenant_id = ? 
    AND app.patient_id = ?
    limit ? offset ?
`;
  const query2 = `SELECT 
    COUNT(*) as total
FROM 
    appointment AS app
WHERE 
    app.tenant_id = ? 
    AND app.patient_id = ?
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      patient_id,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [tenantId, patient_id]);
   
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAppointmentByTenantIdAndAppointmentId = async (
  tenant_id,
  appointment_id
) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      "appointment",
      "tenant_id",
      tenant_id,
      "appointment_id",
      appointment_id
    );
    console.log(tenant_id, appointment_id, rows);
    return rows || null;
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
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAppointmentsWithDetails = async (
  tenantId,
  clinic_id,
  dentist_id,
  limit,
  offset
) => {
  const query1 = `SELECT 
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

  const query2 = `SELECT 
  COUNT(*) as total
FROM appointment AS app
JOIN patient AS p ON p.patient_id = app.patient_id
WHERE app.tenant_id = ? 
  AND app.clinic_id = ? 
  AND app.dentist_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinic_id,
      dentist_id,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [
      tenantId,
      clinic_id,
      dentist_id,
    ]);
    
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAppointmentsWithDetailsByPatient = async (
  tenantId,
  patientId,
  limit,
  offset
) => {
  console.log(tenantId, patientId, limit, offset);
  const query1 = `SELECT 
  CONCAT(d.first_name, ' ', d.last_name) AS dentist_name,
  d.specialisation,
  d.profile_picture,
  d.gender,
  d.date_of_birth,
  app.status,
  d.dentist_id,
  d.working_hours,
  d.duration,
  app.visit_reason,
  app.appointment_id,
  app.appointment_date,
  app.start_time,
  app.end_time
FROM appointment AS app
JOIN dentist AS d ON d.dentist_id = app.dentist_id
WHERE app.tenant_id = ? 
  AND app.patient_id = ?
  limit ? offset ?;
`;
  const query2 = `SELECT 
  COUNT(*) as total
FROM appointment AS app
JOIN dentist AS d ON d.dentist_id = app.dentist_id
WHERE app.tenant_id = ? 
  AND app.patient_id = ?
`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      patientId,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [tenantId, patientId]);
    
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAppointmentMonthlySummary = async (
  tenantId,
  clinic_id,
  dentist_id
) => {
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

    return rows;
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

//query based on monthly and yearly and weekly

const getAppointmentSummary = async (
  tenantId,
  clinic_id,
  period = "monthly"
) => {
  let startDateCondition;

  // Determine date range condition based on the period
  switch (period.toLowerCase()) {
    case "weekly":
      startDateCondition = `app.appointment_date >= DATE_FORMAT(CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY, '%Y-%m-%d')`;
      break;
    case "yearly":
      startDateCondition = `app.appointment_date >= DATE_FORMAT(CURDATE(), '%Y-01-01')`;
      break;
    case "daily":
      startDateCondition = `app.appointment_date >= CURDATE()`;
      break;
    case "monthly":
    default:
      startDateCondition = `app.appointment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`;
      break;
  }

  const endDateCondition = `app.appointment_date < DATE_FORMAT(CURDATE() + INTERVAL 1 ${
    period === "yearly" ? "YEAR" : period === "monthly" ? "MONTH" : "WEEK"
  }, '%Y-%m-01')`;

  const query = `
    SELECT 
      COUNT(*) AS total_appointments,
      SUM(CASE WHEN app.status = 'CP' THEN 1 ELSE 0 END) AS completed_appointments,
      SUM(CASE WHEN app.status = 'SC' THEN 1 ELSE 0 END) AS pending_appointments,
      SUM(CASE WHEN app.status = 'CL' THEN 1 ELSE 0 END) AS cancelled_appointments
    FROM 
      appointment AS app
    WHERE 
      app.tenant_id = ?
      AND app.clinic_id = ?
      AND ${startDateCondition}
      AND ${endDateCondition};
  `;

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, clinic_id]);
    console.log(`Appointments (${period} summary):`, rows);
    return rows[0]; // Return the first row since it's an aggregate result
  } catch (error) {
    console.error("Database Operation Failed:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const fetchDataForRange = async (tenant_id, clinic_id, from, to) => {
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) as count
       FROM appointment
       WHERE tenant_id = ? AND clinic_id = ? AND created_time BETWEEN ? AND ?
       GROUP BY status`,
    [tenant_id, clinic_id, from, to]
  );

  const result = { CP: 0, SC: 0, CL: 0 };
  rows.forEach((row) => {
    result[row.status] = row.count;
  });

  return result.CP + result.SC + result.CL;
};

const getPatientVisitDetailsByPatientIdAndTenantIdAndClinicId = async (
  tenantId,
  clinicId,
  patientId,
  limit,
  offset
) => {
  const query1 = `SELECT 
    p.patient_id,
     CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
     app.appointment_date,
     app.visit_reason
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
    app.status='completed'
    limit ? offset ? 
`;

  const query2 = `SELECT 
    COUNT(*) as total
FROM 
    appointment AS app
WHERE 
    app.tenant_id = ? 
    AND app.clinic_id = ? 
    AND app.dentist_id = ? AND
    app.status='completed'`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      patientId,
      Number(limit),
      offset,
    ]);
    const [counts] = await conn.query(query2, [tenantId, clinicId, patientId]);
    console.log({ data: rows, total: counts[0].total });
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getDentistIdByTenantIdAndAppointmentId = async (
  tenantId,
  appointment_id,
  status
) => {
  const query = `
    SELECT 
      app.dentist_id as dentistId
    FROM 
      appointment AS app
    WHERE 
      app.tenant_id = ? AND 
      app.appointment_id = ? AND
      app.status = ?
  `;

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, appointment_id, status]);
    // Check if a row was found, and return the dentistId or null/undefined
    return rows.length > 0 ? rows[0].dentistId : null;
  } catch (error) {
    console.log(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};


const updateAppoinmentFeedback = async (appointment_id,tenant_id,details,status) => {
  const { doctor_rating,feedback } = details;

  let query = `
    UPDATE appointment 
    SET doctor_rating = ?,feedback=?  WHERE appointment_id = ? 
      AND tenant_id = ? 
      AND status = ?
  `;

  let queryParams = [doctor_rating,feedback,appointment_id,tenant_id,status];

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, queryParams);
    return rows.affectedRows > 0;
  } catch (error) {
    console.error("Error updating appointment status:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const updateAppoinmentStatus = async (appointment_id, tenantId, clinicId, details) => {
  const { status, cancelled_by, cancellation_reason } = details;

  let query = `
    UPDATE appointment 
    SET status = ?
  `;

  let queryParams = [status];

  // Add cancellation fields if status is 'cancelled'
  if (status === "cancelled") {
    query += `, cancelled_by = ?, cancellation_reason = ?`;
    queryParams.push(cancelled_by, cancellation_reason);
  }

  query += `
    WHERE appointment_id = ? 
      AND tenant_id = ? 
      AND clinic_id = ?
  `;

  queryParams.push(appointment_id, tenantId, clinicId);

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, queryParams);
    return rows.affectedRows > 0;
  } catch (error) {
    console.error("Error updating appointment status:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const updateAppoinmentStatusCancelledAndReschedule = async (
  appointment_id,
  tenantId,
  clinicId,
  cancelled_by,
  cancellation_reason
) => {
  const query = `
    UPDATE appointment 
    SET status = 'rescheduled',cancelled_by=?,cancellation_reason=?
    WHERE 
      appointment_id = ? 
      AND tenant_id = ?  
      AND clinic_id = ?
  `;

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [
      cancelled_by,
      cancellation_reason,
      appointment_id,
      tenantId,
      clinicId,
    ]);
    return rows.affectedRows > 0;
  } catch (error) {
    console.error("Error updating appointment status:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const updateRoomIdBeforeAppointment = async () => {
  try {
    const [appointments] = await pool.execute(`
      SELECT appointment_id 
      FROM appointment 
      WHERE appointment_date = CURDATE()
        AND start_time BETWEEN DATE_FORMAT(NOW() + INTERVAL 1 MINUTE, '%H:%i:00') AND DATE_FORMAT(NOW() + INTERVAL 1 MINUTE, '%H:%i:59')
        AND is_virtual = 1
        AND room_id = '00000000-0000-0000-0000-000000000000'
    `);

    const updatePromises = appointments.map(({ appointment_id }) => {
      const roomId = uuidv4(); // or crypto.randomUUID() for Node 19+
      return pool.execute(
        `
        UPDATE appointment SET room_id = ? WHERE appointment_id = ?
      `,
        [roomId, appointment_id]
      );
    });

    await Promise.all(updatePromises);

    console.log(`Updated ${appointments.length} room_ids`);
  } catch (err) {
    console.error("Error updating room_id:", err);
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
  updateAppoinmentStatus,
  getAppointmentSummary,
  getAllAppointmentsByTenantIdAndClinicId,
  getAllAppointmentsByTenantIdAndClinicIdByDentist,
  getAllAppointmentsByTenantIdAndClinicIdAndDentistId,
  fetchDataForRange,
  updateAppoinmentStatusCancelledAndReschedule,
  getAppointmentsWithDetailsByPatient,
  getAllAppointmentsByTenantIdAndDentistId,
  getAllAppointmentsByTenantIdAndPatientId,
  updateRoomIdBeforeAppointment,
  getAllRoomIdByTenantIdAndClinicIdAndDentistId,
  getAllRoomIdByTenantIdAndClinicIdAndPatientId,
  updateAppoinmentFeedback,
  getDentistIdByTenantIdAndAppointmentId
};
