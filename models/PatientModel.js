const pool = require("../config/db");
const record = require("../query/Records");
const { formatDateOnly } = require("../utils/DateUtils");

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
    throw new Error("Database Operation Failed");
  }
};

const getAllPatientsByTenantId = async (tenantId, limit, offset) => {
  try {
    if (limit < 1 || offset < 0)
      throw new Error("Invalid pagination parameters.");
    const patients = await record.getAllRecords(
      "patient",
      "tenant_id",
      tenantId,
      limit,
      offset
    );
    return patients;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error fetching patients.");
  }
};

const getPatientByTenantIdAndPatientId = async (tenant_id, patient_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      "patient",
      "tenant_id",
      tenant_id,
      "patient_id",
      patient_id
    );
    return rows || null;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error fetching patient.");
  }
};

const updatePatient = async (patient_id, columns, values, tenant_id) => {
  const conditionColumn = ["tenant_id", "patient_id"];
  const conditionValue = [tenant_id, patient_id];

  try {
    const result = await record.updateRecord(
      "patient",
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

const deletePatientByTenantIdAndPatientId = async (tenant_id, patient_id) => {
  const conditionColumn = ["tenant_id", "patient_id"];
  const conditionValue = [tenant_id, patient_id];

  try {
    const result = await record.deleteRecord(
      "patient",
      conditionColumn,
      conditionValue
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Error deleting patient.");
  }
};

const checkPatientExistsByTenantIdAndPatientId = async (
  tenantId,
  patientId
) => {
  const query = `SELECT EXISTS(SELECT 1 FROM patient WHERE tenant_id = ? AND patient_id = ?) AS \`exists\``;
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(query, [tenantId, patientId]);
    return Boolean(rows[0].exists); // Ensure consistent return type (true/false)
  } catch (error) {
    console.error("Error checking patient existence:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const updatePatientAppointmentCount = async (
  tenantId,
  patientId,
  assign = true
) => {
  const modifier = assign ? 1 : -1;

  const query = `
    UPDATE patient
    SET appointment_count = GREATEST(appointment_count + ?, 0)
    WHERE tenant_id = ? AND patient_id = ?;
  `;

  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(query, [modifier, tenantId, patientId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error updating appointment count:", error);
    throw new Error(
      `Database Operation Failed while ${
        assign ? "incrementing" : "decrementing"
      } appointment count`
    );
  } finally {
    conn.release();
  }
};

const getPeriodSummaryByPatient = async (tenantId, clinicId, dentistId) => {
  const query = `
    SELECT 
      CONCAT(p.first_name, ' ', p.last_name) AS name,
      p.created_time
    FROM 
      patient p
    INNER JOIN appointment app 
      ON p.patient_id = app.patient_id
    WHERE 
      app.tenant_id = ? AND
      app.clinic_id = ? AND
      app.dentist_id = ? AND 
      p.appointment_count>0
    GROUP BY 
      p.patient_id, p.first_name, p.last_name, p.created_time
  `;

  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(query, [tenantId, clinicId, dentistId]);
    return rows; // Returns list of { name, created_time }
  } catch (error) {
    console.error("Error fetching patient summary:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAppointmentsForAnalytics = async (tenantId, clinicId, dentistId) => {
  const query = `
    SELECT
      a.appointment_id,
      a.patient_id,
      CONCAT(p.first_name, ' ', p.last_name) AS name,
      a.appointment_date,
      a.created_time
    FROM
      appointment a
    JOIN
      patient p ON a.patient_id = p.patient_id
    WHERE
      a.tenant_id = ?
      AND a.clinic_id = ?
      AND a.dentist_id = ?
  `;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, clinicId, dentistId]);
    return rows;
  } catch (error) {
    console.error("Error fetching appointment analytics:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

// const groupToothProceduresByTimeRangeCumulative = async (
//   tenantId,
//   clinicId
// ) => {
//   const query = `
//     SELECT
//       p.patient_id,
//       p.tooth_details
//     FROM
//       patient p
//     WHERE
//       p.tenant_id = ?
//       AND EXISTS (
//         SELECT 1 FROM appointment a
//         WHERE a.patient_id = p.patient_id
//           AND a.clinic_id = ?
//       )
//   `;
//   const conn = await pool.getConnection();
//   try {
//     const [rows] = await conn.query(query, [tenantId, clinicId]);
//     return rows;
//   } catch (error) {
//     console.error("Error fetching tooth details:", error);
//     throw new Error("Database Operation Failed");
//   } finally {
//     conn.release();
//   }
// };

const groupToothProceduresByTimeRangeCumulative = async (
  tenantId,
  clinicId,
  startDate,
  endDate,
  dentistId = null
) => {
  const query = `
    SELECT
      treatment_date AS date,
      disease_type,
      COUNT(*) AS count
    FROM
      toothdetails
    WHERE
      tenant_id = ?
      AND clinic_id = ?
      AND treatment_date BETWEEN ? AND ?
      ${dentistId ? "AND dentist_id = ?" : ""}
    GROUP BY
      treatment_date,
      disease_type
    ORDER BY
      treatment_date;
  `;

  const params = dentistId
    ? [tenantId, clinicId, startDate, endDate, dentistId]
    : [tenantId, clinicId, startDate, endDate];

  const [rows] = await pool.query(query, params);

  // Transforming result to grouped format
  const resultMap = {};

  for (const row of rows) {
    const { date, disease_type, count } = row;
    if (!resultMap[date]) resultMap[date] = {};
    resultMap[date][disease_type] = count;
  }

  return Object.entries(resultMap).map(([date, procedures]) => ({
    date: formatDateOnly(date),
    procedures,
  }));
};

const groupToothProceduresByTimeRangeCumulativeByDentist = async (
  tenantId,
  clinicId,
  dentistId
) => {
  const query = `
    SELECT
  p.patient_id,
  p.tooth_details
FROM
  patient p
WHERE
  p.tenant_id = ?
  AND EXISTS (
    SELECT 1 FROM appointment a
    WHERE a.patient_id = p.patient_id
      AND a.clinic_id = ?
      AND a.dentist_id = ?
  )

  `;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenantId, clinicId, dentistId]);
    return rows;
  } catch (error) {
    console.error("Error fetching tooth details:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getMostVisitedPatientsByDentistPeriods = async (
  tenantId,
  clinicId,
  dentistId
) => {
  let query = `
      SELECT
        a.patient_id,
        CONCAT(p.first_name, ' ', p.last_name) AS name,
        a.appointment_date
      FROM
        appointment a
      JOIN
        patient p ON a.patient_id = p.patient_id
      WHERE
        a.tenant_id = ?
        AND a.dentist_id = ?
        AND p.appointment_count>0
    `;
  const params = [tenantId, dentistId];
  if (clinicId) {
    query += " AND a.clinic_id = ?";
    params.push(clinicId);
  }
  const conn = await pool.getConnection();
  let rows;
  try {
    [rows] = await conn.query(query, params);
    return rows;
  } catch (error) {
    console.error("Error fetching tooth details:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

// const getMostVisitedPatientsByClinicPeriods = async (tenantId, clinicId) => {
//   const query = `
//       SELECT
//         a.patient_id,
//         CONCAT(p.first_name, ' ', p.last_name) AS name,
//         a.appointment_date
//       FROM
//         appointment a
//       JOIN
//         patient p ON a.patient_id = p.patient_id
//       WHERE
//         a.tenant_id = ?
//         AND a.clinic_id = ?
//     `;
//   const conn = await pool.getConnection();
//   let rows;
//   try {
//     [rows] = await conn.query(query, [tenantId, clinicId]);
//     return rows;
//   } catch (error) {
//     console.error("Error fetching tooth details:", error);
//     throw new Error("Database Operation Failed");
//   } finally {
//     conn.release();
//   }
// }

/**
 * Fetches daily patient data grouped by date with new vs repeated patients
 *
 * @param {number} tenant_id
 * @param {number} clinic_id
 * @param {string} startDate - 'YYYY-MM-DD'
 * @param {string} endDate - 'YYYY-MM-DD'
 * @param {number|null} dentist_id
 * @returns {Promise<{daily_patient_data: Array}>}
 */
async function getMostVisitedPatientsByClinicPeriods(
  tenant_id,
  clinic_id,
  startDate,
  endDate,
  dentist_id = null
) {
  const conn = await pool.getConnection();
  try {
    // Query appointments joined with patient table
    let query = `
      SELECT 
        a.appointment_date,
        p.patient_id,
        p.first_name AS name,
        TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) AS age,
        CASE WHEN p.gender = 'M' THEN 'Male' ELSE 'Female' END AS gender
      FROM appointment a
      JOIN patient p ON a.patient_id = p.patient_id
      WHERE a.tenant_id = ?
        AND a.clinic_id = ?
        AND a.appointment_date BETWEEN ? AND ?
    `;

    const queryParams = [tenant_id, clinic_id, startDate, endDate];

    if (dentist_id) {
      query += ` AND a.dentist_id = ?`;
      queryParams.push(dentist_id);
    }

    query += ` ORDER BY a.appointment_date ASC`;

    const [rows] = await conn.query(query, queryParams);

    // Build result structure
    return formatDailyPatientData(rows);
  } finally {
    conn.release();
  }
}

/**
 * Formats raw DB rows into daily_patient_data structure
 * @param {Array} rows
 * @returns {{daily_patient_data: Array}}
 */
function formatDailyPatientData(rows) {
  const firstVisitMap = {}; // key: name-age-gender => earliest date
  const dailyMap = {};

  // First pass: identify first visit for each patient
  rows.forEach((row) => {
    const key = `${row.name}-${row.age}-${row.gender}`;
    if (!firstVisitMap[key] || row.appointment_date < firstVisitMap[key]) {
      firstVisitMap[key] = row.appointment_date;
    }
  });

  // Second pass: group by date and classify as new or repeat
  rows.forEach((row) => {
    const key = `${row.name}-${row.age}-${row.gender}`;
    const dateStr = row.appointment_date.toISOString().split("T")[0];

    if (!dailyMap[dateStr]) {
      dailyMap[dateStr] = {
        date: dateStr,
        new_patients: [],
        repeated_patients: [],
      };
    }

    const isRepeat = firstVisitMap[key] < row.appointment_date;

    const patientEntry = {
      name: row.name,
      age: row.age,
      gender: row.gender,
    };

    if (isRepeat) {
      dailyMap[dateStr].repeated_patients.push(patientEntry);
    } else {
      dailyMap[dateStr].new_patients.push(patientEntry);
    }
  });

  // Convert map to array and sort by date
  const dailyData = Object.values(dailyMap).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return {
    daily_patient_data: dailyData,
  };
}

const getNewPatientsTrends = async (tenantId, clinicId) => {
  const query = `
      SELECT
        patient_id,
        created_time
      FROM
        patient
      WHERE
        tenant_id = ?
        AND EXISTS (
          SELECT 1 FROM appointment a
          WHERE a.patient_id = patient.patient_id AND a.clinic_id = ?
        )
    `;
  const conn = await pool.getConnection();
  let rows;
  try {
    [rows] = await conn.query(query, [tenantId, clinicId]);
    return rows;
  } catch (error) {
    console.error("Error fetching tooth details:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};
const getNewPatientsTrendsByDentistAndClinic = async (
  tenantId,
  clinicId,
  dentistId
) => {
  const query = `
  SELECT
    p.patient_id,
    MIN(a.appointment_date) AS first_appt_date
  FROM
    appointment a
  JOIN
    patient p ON a.patient_id = p.patient_id
  WHERE
    a.tenant_id = ?
    AND a.clinic_id = ?
    AND a.dentist_id = ?
  GROUP BY
    p.patient_id
`;
  const conn = await pool.getConnection();
  let rows;
  try {
    [rows] = await conn.query(query, [tenantId, clinicId, dentistId]);
  } catch (error) {
    console.error("Error fetching new patients:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAgeGenderByDentist = async (tenantId, clinicId, dentistId) => {
  const query = `
    SELECT
      p.date_of_birth,
      p.gender
    FROM
      appointment a
    JOIN
      patient p ON a.patient_id = p.patient_id
    WHERE
      a.tenant_id = ?
      AND a.clinic_id = ?
      AND a.dentist_id = ?
    GROUP BY
      p.patient_id
  `;
  const conn = await pool.getConnection();
  let patients;
  try {
    [patients] = await conn.query(query, [tenantId, clinicId, dentistId]);
    return patients;
  } catch (error) {
    console.error("Error fetching by agegender:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};
const getAgeGenderByClinic = async (tenantId, clinicId) => {
  const query = `
    SELECT
      p.date_of_birth,
      p.gender
    FROM
      appointment a
    JOIN
      patient p ON a.patient_id = p.patient_id
    WHERE
      a.tenant_id = ?
      AND a.clinic_id = ?
    GROUP BY
      p.patient_id
  `;
  const conn = await pool.getConnection();
  let patients;
  try {
    [patients] = await conn.query(query, [tenantId, clinicId]);
    return patients;
  } catch (error) {
    console.error("Error fetching by agegender:", error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAllPatientsByTenantIdAndClinicId = async (
  tenantId,
  clinicId,
  limit,
  offset
) => {
  console.log(tenantId,clinicId,limit,offset)
  const query1 = `SELECT
      p.*,
      pc.clinic_id
    FROM
      patient p
    JOIN
      patient_clinic pc ON pc.patient_id = p.patient_id
    WHERE
      p.tenant_id = ?
      AND pc.clinic_id = ? limit ? offset ?`;
  const query2 = `SELECT
     count(*) as total
    FROM
      patient p
    JOIN
      patient_clinic pc ON pc.patient_id = p.patient_id
    WHERE
      p.tenant_id = ?
      AND pc.clinic_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      limit,
      offset,
    ]);
    console.log(rows)
    const [counts] = await conn.query(query2, [tenantId, clinicId]);
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getAllPatientsByTenantIdAndClinicIdAndDentistId = async (
  tenantId,
  clinicId,
  dentistId,
  limit,
  offset
) => {

  const query1 = `SELECT
      p.*,
      pc.clinic_id
    FROM
      patient p
    JOIN
      patient_clinic pc ON pc.patient_id = p.patient_id
    JOIN 
      dentist d ON d.clinic_id = pc.clinic_id
    WHERE
      p.tenant_id = ?
      AND pc.clinic_id = ? AND d.dentist_id=? limit ? offset ?`;
  const query2 = `SELECT
     count(*) as total
    FROM
      patient p
    JOIN
      patient_clinic pc ON pc.patient_id = p.patient_id
    JOIN 
      dentist d ON d.clinic_id = pc.clinic_id
    WHERE
      p.tenant_id = ?
      AND pc.clinic_id = ? AND d.dentist_id=?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      dentistId,
      limit,
      offset,
    ]);
    console.log(rows)
    const [counts] = await conn.query(query2, [tenantId, clinicId,dentistId]);
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};
const getAllPatientsByTenantIdAndClinicIdUsingAppointmentStatus = async (
  tenantId,
  clinicId,
  dentistId,
  limit,
  offset
) => {

  console.log(tenantId,
    clinicId,
    dentistId,
    limit,
    offset)

  const query1 = `SELECT
      p.*,
      a.clinic_id
    FROM
      patient p
    INNER JOIN
      appointment a ON a.patient_id = p.patient_id
    WHERE
      a.tenant_id = ?
      AND a.clinic_id = ?
      AND a.dentist_id = ?
      AND a.status IN ('completed', 'confirmed', 'pending')
    GROUP BY
      p.patient_id, a.clinic_id, p.tenant_id
    ORDER BY
      p.last_name ASC limit ? offset ?`;
  const query2 = `SELECT
     count(*) as total
    FROM
      patient p
    INNER JOIN
      appointment a ON a.patient_id = p.patient_id
    WHERE
      a.tenant_id = ?
      AND a.clinic_id = ?
      AND a.dentist_id = ?
      AND a.status IN ('completed', 'confirmed', 'pending')`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      clinicId,
      dentistId,
      limit,
      offset,
    ]);
    console.log(rows)
    const [counts] = await conn.query(query2, [tenantId, clinicId,dentistId]);
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

// const getAllPatientsByTenantIdAndClinicIdUsingAppointmentStatus = async (
//   tenantId,
//   clinicId,
//   dentist_id
// ) => {
//   const query = `
//     SELECT
//       p.tenant_id,
//       a.clinic_id,
//       p.patient_id,
//       CONCAT(p.first_name, ' ', p.last_name) AS full_name
//     FROM
//       patient p
//     INNER JOIN
//       appointment a ON a.patient_id = p.patient_id
//     WHERE
//       a.tenant_id = ?
//       AND a.clinic_id = ?
//       AND a.dentist_id = ?
//       AND a.status IN ('completed', 'confirmed', 'pending')
//     GROUP BY
//       p.patient_id, a.clinic_id, p.tenant_id
//     ORDER BY
//       p.last_name ASC
//   `;

//   const conn = await pool.getConnection();
//   try {
//     const [patients] = await conn.query(query, [
//       tenantId,
//       clinicId,
//       dentist_id,
//     ]);

//     return patients;
//   } catch (error) {
//     console.error("Error fetching patients:", error);
//     throw new Error("Database Operation Failed");
//   } finally {
//     conn.release();
//   }
// };

module.exports = {
  createPatient,
  getAllPatientsByTenantId,
  getPatientByTenantIdAndPatientId,
  updatePatient,
  deletePatientByTenantIdAndPatientId,
  checkPatientExistsByTenantIdAndPatientId,
  getPeriodSummaryByPatient,
  updatePatientAppointmentCount,
  getAppointmentsForAnalytics,
  groupToothProceduresByTimeRangeCumulative,
  groupToothProceduresByTimeRangeCumulativeByDentist,
  getMostVisitedPatientsByDentistPeriods,
  getMostVisitedPatientsByClinicPeriods,
  getNewPatientsTrends,
  getNewPatientsTrendsByDentistAndClinic,
  getAgeGenderByDentist,
  getAgeGenderByClinic,
  getAllPatientsByTenantIdAndClinicId,
  getAllPatientsByTenantIdAndClinicIdAndDentistId,
  getAllPatientsByTenantIdAndClinicIdUsingAppointmentStatus
};
