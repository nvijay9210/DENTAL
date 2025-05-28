const { CustomError } = require("../middlewares/CustomeError");
const moment = require('moment');
const pool = require("../config/db");
const patientModel = require("../models/PatientModel");
const {
  redisClient,
  invalidateCacheByPattern,
  getOrSetCache,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { formatDateOnly } = require("../utils/DateUtils");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const patiendFields = {
  tenant_id: (val) => val,
  first_name: (val) => val,
  last_name: (val) => val,
  email: (val) => val || null,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val || null,
  date_of_birth: (val) => val?formatDateOnly(val):null,
  gender: (val) => val,
  blood_group: (val) => val || null,
  address: (val) => val || null,
  city: (val) => val || null,
  state: (val) => val || null,
  country: (val) => val || null,
  pin_code: (val) => val || null,
  profession: (val) => val || null,
  referred_by: (val) => val || null,
  tooth_details: helper.safeStringify,
  smoking_status: (val) => val,
  alcohol_consumption: (val) => val,
  emergency_contact_name: (val) => val || null,
  emergency_contact_number: (val) => val || null,
  insurance_provider: (val) => val || null,
  insurance_policy_number: (val) => val || null,
  profile_picture: (val) => val || null,
};

const patientFieldsReverseMap = {
  patient_id: (val) => val,
  tenant_id: (val) => val,
  first_name: (val) => val,
  last_name: (val) => val,
  email: (val) => val,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val,
  date_of_birth: (val) =>
    val ? formatDateOnly(val):null,
  gender: (val) => val,
  blood_group: (val) => val,
  address: (val) => helper.safeJsonParse(val),
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pin_code: (val) => val,
  profession: (val) => val,
  referred_by: (val) => val,
  tooth_details: helper.safeJsonParse,
  treatment_history: helper.safeJsonParse,
  pre_history: helper.safeJsonParse,
  current_medication: helper.safeJsonParse,
  smoking_status: (val) => val,
  alcohol_consumption: (val) => val,
  emergency_contact_name: (val) => val,
  emergency_contact_number: (val) => val,
  insurance_provider: (val) => val,
  insurance_policy_number: (val) => val,
  profile_picture: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? new Date(val).toISOString() : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? new Date(val).toISOString() : null),
};

// Create patient
const createPatient = async (data) => {
  const create = {
    ...patiendFields,
    created_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, create);
    const patientId = await patientModel.createPatient(
      "patient",
      columns,
      values
    );
    await invalidateCacheByPattern("patients:*");
    return patientId;
  } catch (error) {
    console.trace(error);
    throw new CustomError(`Failed to create patient: ${error.message}`, 404);
  }
};

const getAllPatientsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `patients:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const patients = await getOrSetCache(cacheKey, async () => {
      const result = await patientModel.getAllPatientsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      console.log("✅ Serving patients from DB and caching result");
      return result;
    });

    const convertedRows = patients.map((patient) =>
      helper.convertDbToFrontend(patient, patientFieldsReverseMap)
    );

    return convertedRows;
  } catch (error) {
    console.error(error);
    throw new CustomError("Database error while fetching patients", 404);
  }
};

const getMostVisitedPatientsByDentistPeriods = async (tenantId, dentistId, clinicId = null, topN = 5) => {
  // Fetch all appointments for the dentist (and optionally clinic)
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
  `;
  const params = [tenantId, dentistId];
  if (clinicId) {
    query += ' AND a.clinic_id = ?';
    params.push(clinicId);
  }
  const conn = await pool.getConnection();
  let rows;
  try {
    [rows] = await conn.query(query, params);
  } finally {
    conn.release();
  }

  console.log(rows)

  const now = moment().utc();
  const result = {};

  // --- Weekly Data for Current Month (1w-5w) ---
  const weeksInMonth = Math.ceil(now.daysInMonth() / 7);
  for (let w = 1; w <= weeksInMonth; w++) {
    const weekStart = now.clone().startOf('month').add((w - 1) * 7, 'days');
    let weekEnd = weekStart.clone().add(6, 'days').endOf('day');
    const monthEnd = now.clone().endOf('month');
    if (weekEnd.isAfter(monthEnd)) weekEnd = monthEnd;

    const filtered = rows.filter(row => {
      const apptDate = moment(row.appointment_date).utc();
      return apptDate.isBetween(weekStart, weekEnd, null, '[]');
    });

    const nameCount = {};
    for (const row of filtered) {
      nameCount[row.name] = (nameCount[row.name] || 0) + 1;
    }
    const sorted = Object.entries(nameCount).sort((a, b) => b[1] - a[1]);
    const labels = sorted.slice(0, topN).map(([name]) => name);
    const data = sorted.slice(0, topN).map(([, count]) => count);

    result[`${w}w`] = {
      labels,
      datasets: [{ data }]
    };
  }

  // --- Monthly Data for Past 12 Months (1m = current, 12m = 11 months ago) ---
  for (let m = 1; m <= 12; m++) {
    const periodStart = now.clone().startOf('month').subtract(m - 1, 'months');
    const periodEnd = periodStart.clone().endOf('month');

    const filtered = rows.filter(row => {
      const apptDate = moment(row.appointment_date).utc();
      return apptDate.isBetween(periodStart, periodEnd, null, '[]');
    });

    const nameCount = {};
    for (const row of filtered) {
      nameCount[row.name] = (nameCount[row.name] || 0) + 1;
    }
    const sorted = Object.entries(nameCount).sort((a, b) => b[1] - a[1]);
    const labels = sorted.slice(0, topN).map(([name]) => name);
    const data = sorted.slice(0, topN).map(([, count]) => count);

    result[`${m}m`] = {
      labels,
      datasets: [{ data }]
    };
  }

  // --- Yearly Data for Past 4 Years (1y = current, 4y = 3 years ago) ---
  for (let y = 1; y <= 4; y++) {
    const periodStart = now.clone().startOf('year').subtract(y - 1, 'years');
    const periodEnd = periodStart.clone().endOf('year');

    const filtered = rows.filter(row => {
      const apptDate = moment(row.appointment_date).utc();
      return apptDate.isBetween(periodStart, periodEnd, null, '[]');
    });

    const nameCount = {};
    for (const row of filtered) {
      nameCount[row.name] = (nameCount[row.name] || 0) + 1;
    }
    const sorted = Object.entries(nameCount).sort((a, b) => b[1] - a[1]);
    const labels = sorted.slice(0, topN).map(([name]) => name);
    const data = sorted.slice(0, topN).map(([, count]) => count);

    result[`${y}y`] = {
      labels,
      datasets: [{ data }]
    };
  }

  return result;
};

const getMostVisitedPatientsByClinicPeriods = async (tenantId, clinicId, topN = 5) => {
  // Fetch all appointments for the clinic
  const query = `
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
      AND a.clinic_id = ?
  `;
  const conn = await pool.getConnection();
  let rows;
  try {
    [rows] = await conn.query(query, [tenantId, clinicId]);
  } finally {
    conn.release();
  }

  console.log(rows)

  const now = moment().utc();
  const result = {};

  // --- Weekly Data for Current Month (1w-5w) ---
  const weeksInMonth = Math.ceil(now.daysInMonth() / 7);
  for (let w = 1; w <= weeksInMonth; w++) {
    const weekStart = now.clone().startOf('month').add((w - 1) * 7, 'days');
    let weekEnd = weekStart.clone().add(6, 'days').endOf('day');
    const monthEnd = now.clone().endOf('month');
    if (weekEnd.isAfter(monthEnd)) weekEnd = monthEnd;

    const filtered = rows.filter(row => {
      const apptDate = moment(row.appointment_date).utc();
      return apptDate.isBetween(weekStart, weekEnd, null, '[]');
    });

    const nameCount = {};
    for (const row of filtered) {
      nameCount[row.name] = (nameCount[row.name] || 0) + 1;
    }
    const sorted = Object.entries(nameCount).sort((a, b) => b[1] - a[1]);
    const labels = sorted.slice(0, topN).map(([name]) => name);
    const data = sorted.slice(0, topN).map(([, count]) => count);

    result[`${w}w`] = {
      labels,
      datasets: [{ data }]
    };
  }

  // --- Monthly Data for Past 12 Months (1m = current, 12m = 11 months ago) ---
  for (let m = 1; m <= 12; m++) {
    const periodStart = now.clone().startOf('month').subtract(m - 1, 'months');
    const periodEnd = periodStart.clone().endOf('month');

    const filtered = rows.filter(row => {
      const apptDate = moment(row.appointment_date).utc();
      return apptDate.isBetween(periodStart, periodEnd, null, '[]');
    });

    const nameCount = {};
    for (const row of filtered) {
      nameCount[row.name] = (nameCount[row.name] || 0) + 1;
    }
    const sorted = Object.entries(nameCount).sort((a, b) => b[1] - a[1]);
    const labels = sorted.slice(0, topN).map(([name]) => name);
    const data = sorted.slice(0, topN).map(([, count]) => count);

    result[`${m}m`] = {
      labels,
      datasets: [{ data }]
    };
  }

  // --- Yearly Data for Past 4 Years (1y = current, 4y = 3 years ago) ---
  for (let y = 1; y <= 4; y++) {
    const periodStart = now.clone().startOf('year').subtract(y - 1, 'years');
    const periodEnd = periodStart.clone().endOf('year');

    const filtered = rows.filter(row => {
      const apptDate = moment(row.appointment_date).utc();
      return apptDate.isBetween(periodStart, periodEnd, null, '[]');
    });

    const nameCount = {};
    for (const row of filtered) {
      nameCount[row.name] = (nameCount[row.name] || 0) + 1;
    }
    const sorted = Object.entries(nameCount).sort((a, b) => b[1] - a[1]);
    const labels = sorted.slice(0, topN).map(([name]) => name);
    const data = sorted.slice(0, topN).map(([, count]) => count);

    result[`${y}y`] = {
      labels,
      datasets: [{ data }]
    };
  }

  return result;
};

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
  } finally {
    conn.release();
  }

  const now = moment().utc();
  const result = {};

  // --- 1w: Current week, daily counts (Mon-Sun) ---
  {
    const weekStart = now.clone().startOf('isoWeek');
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [];
    for (let d = 0; d < 7; d++) {
      const dayStart = weekStart.clone().add(d, 'days').startOf('day');
      const dayEnd = dayStart.clone().endOf('day');
      const count = rows.filter(row => {
        const created = moment(row.created_time).utc();
        return created.isBetween(dayStart, dayEnd, null, '[]');
      }).length;
      data.push(count);
    }
    result["1w"] = { labels, datasets: [{ data }] };
  }

  // --- 2w, 3w, 4w: Weekly totals for last N weeks ---
  [2, 3, 4].forEach(nWeeks => {
    const labels = [];
    const data = [];
    for (let w = nWeeks - 1; w >= 0; w--) {
      const weekStart = now.clone().startOf('isoWeek').subtract(w, 'weeks');
      const weekEnd = weekStart.clone().endOf('isoWeek');
      const count = rows.filter(row => {
        const created = moment(row.created_time).utc();
        return created.isBetween(weekStart, weekEnd, null, '[]');
      }).length;
      labels.push(`${nWeeks - w}w`);
      data.push(count);
    }
    result[`${nWeeks}w`] = { labels, datasets: [{ data }] };
  });

  // --- 2m to 12m: Monthly totals for last N months ---
  [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach(nMonths => {
    const labels = [];
    const data = [];
    for (let m = nMonths - 1; m >= 0; m--) {
      const monthStart = now.clone().startOf('month').subtract(m, 'months');
      const monthEnd = monthStart.clone().endOf('month');
      const count = rows.filter(row => {
        const created = moment(row.created_time).utc();
        return created.isBetween(monthStart, monthEnd, null, '[]');
      }).length;
      labels.push(monthStart.format('MMM'));
      data.push(count);
    }
    result[`${nMonths}m`] = { labels, datasets: [{ data }] };
  });

  // --- 2y, 3y, 4y: Yearly totals for last N years ---
  [2, 3, 4].forEach(nYears => {
    const labels = [];
    const data = [];
    for (let y = nYears - 1; y >= 0; y--) {
      const yearStart = now.clone().startOf('year').subtract(y, 'years');
      const yearEnd = yearStart.clone().endOf('year');
      const count = rows.filter(row => {
        const created = moment(row.created_time).utc();
        return created.isBetween(yearStart, yearEnd, null, '[]');
      }).length;
      labels.push(yearStart.format('YYYY'));
      data.push(count);
    }
    result[`${nYears}y`] = { labels, datasets: [{ data }] };
  });

  return result;
};






const getNewPatientsTrendsByDentistAndClinic = async (tenantId, clinicId, dentistId) => {
  // Fetch all patients who have their FIRST appointment with this dentist in this clinic
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
  } finally {
    conn.release();
  }

  const now = moment().utc();
  const result = {};

  // --- 1w: Current week, daily counts (Mon-Sun) ---
  {
    const weekStart = now.clone().startOf('isoWeek');
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = [];
    for (let d = 0; d < 7; d++) {
      const dayStart = weekStart.clone().add(d, 'days').startOf('day');
      const dayEnd = dayStart.clone().endOf('day');
      const count = rows.filter(row => {
        const created = moment(row.first_appt_date).utc();
        return created.isBetween(dayStart, dayEnd, null, '[]');
      }).length;
      data.push(count);
    }
    result['1w'] = { labels, datasets: [{ data }] };
  }

  // --- 4w: Last 4 weeks (labels: "1w", "2w", "3w", "4w") ---
  {
    const labels = [];
    const data = [];
    for (let w = 4; w >= 1; w--) {
      const weekStart = now.clone().startOf('isoWeek').subtract(w - 1, 'weeks');
      const weekEnd = weekStart.clone().endOf('isoWeek');
      const count = rows.filter(row => {
        const created = moment(row.first_appt_date).utc();
        return created.isBetween(weekStart, weekEnd, null, '[]');
      }).length;
      labels.push(`${5 - w}w`);
      data.push(count);
    }
    result['4w'] = { labels, datasets: [{ data }] };
  }

  // --- 4m: Last 4 months (labels: month names) ---
  {
    const labels = [];
    const data = [];
    for (let m = 4; m >= 1; m--) {
      const monthStart = now.clone().startOf('month').subtract(m - 1, 'months');
      const monthEnd = monthStart.clone().endOf('month');
      const count = rows.filter(row => {
        const created = moment(row.first_appt_date).utc();
        return created.isBetween(monthStart, monthEnd, null, '[]');
      }).length;
      labels.push(monthStart.format('MMM'));
      data.push(count);
    }
    result['4m'] = { labels, datasets: [{ data }] };
  }

  // --- 12m: Last 12 months (labels: month names) ---
  {
    const labels = [];
    const data = [];
    for (let m = 12; m >= 1; m--) {
      const monthStart = now.clone().startOf('month').subtract(m - 1, 'months');
      const monthEnd = monthStart.clone().endOf('month');
      const count = rows.filter(row => {
        const created = moment(row.first_appt_date).utc();
        return created.isBetween(monthStart, monthEnd, null, '[]');
      }).length;
      labels.push(monthStart.format('MMM'));
      data.push(count);
    }
    result['12m'] = { labels, datasets: [{ data }] };
  }

  // --- 4y: Last 4 years (labels: years) ---
  {
    const labels = [];
    const data = [];
    for (let y = 4; y >= 1; y--) {
      const yearStart = now.clone().startOf('year').subtract(y - 1, 'years');
      const yearEnd = yearStart.clone().endOf('year');
      const count = rows.filter(row => {
        const created = moment(row.first_appt_date).utc();
        return created.isBetween(yearStart, yearEnd, null, '[]');
      }).length;
      labels.push(yearStart.format('YYYY'));
      data.push(count);
    }
    result['4y'] = { labels, datasets: [{ data }] };
  }

  return result;
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
  } finally {
    conn.release();
  }

  const ageGroups = [
    { label: "2-12", min: 2, max: 12 },
    { label: "13-19", min: 13, max: 19 },
    { label: "20-35", min: 20, max: 35 },
    { label: "35-50", min: 36, max: 50 },
    { label: "50-70", min: 51, max: 70 }
  ];

  const maleCounts = Array(ageGroups.length).fill(0);
  const femaleCounts = Array(ageGroups.length).fill(0);

  // Fixed current date as per your requirement
  const today = new Date(2025, 4, 28); // May is 4 (0-based in JS)

  function getAge(dateString) {
    const birth = new Date(dateString);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  patients.forEach(patient => {
    if (!patient.date_of_birth || !patient.gender) return;
    const age = getAge(patient.date_of_birth);
    const groupIdx = ageGroups.findIndex(g => age >= g.min && age <= g.max);
    if (groupIdx === -1) return;

    const gender = patient.gender.toLowerCase();
    if (gender.startsWith("m")) {
      maleCounts[groupIdx]++;
    } else if (gender.startsWith("f")) {
      femaleCounts[groupIdx]++;
    }
  });

  return {
    labels: ageGroups.map(g => g.label),
    datasets: [
      {
        label: "Male",
        data: maleCounts
      },
      {
        label: "Female",
        data: femaleCounts
      }
    ]
  };
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
  } finally {
    conn.release();
  }

  const ageGroups = [
    { label: "2-12", min: 2, max: 12 },
    { label: "13-19", min: 13, max: 19 },
    { label: "20-35", min: 20, max: 35 },
    { label: "35-50", min: 36, max: 50 },
    { label: "50-70", min: 51, max: 70 }
  ];

  const maleCounts = Array(ageGroups.length).fill(0);
  const femaleCounts = Array(ageGroups.length).fill(0);

  // Use fixed current date as per your requirement
  const today = new Date(2025, 4, 28); // May is 4 (0-based in JS)

  function getAge(dateString) {
    const birth = new Date(dateString);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  patients.forEach(patient => {
    if (!patient.date_of_birth || !patient.gender) return;
    const age = getAge(patient.date_of_birth);
    const groupIdx = ageGroups.findIndex(g => age >= g.min && age <= g.max);
    if (groupIdx === -1) return;

    const gender = patient.gender.toLowerCase();
    if (gender.startsWith("m")) {
      maleCounts[groupIdx]++;
    } else if (gender.startsWith("f")) {
      femaleCounts[groupIdx]++;
    }
  });

  return {
    labels: ageGroups.map(g => g.label),
    datasets: [
      {
        label: "Male",
        data: maleCounts
      },
      {
        label: "Female",
        data: femaleCounts
      }
    ]
  };
};



const getPatientByTenantIdAndPatientId = async (tenantId, patientId) => {
  try {
    const patient = await patientModel.getPatientByTenantIdAndPatientId(
      tenantId,
      patientId
    );
    const convertedRows = helper.convertDbToFrontend(
      patient,
      patientFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get patient: " + error.message, 404);
  }
};

// Check existence
const checkPatientExistsByTenantIdAndPatientId = async (
  tenantId,
  patientId
) => {
  try {
    return await patientModel.checkPatientExistsByTenantIdAndPatientId(
      tenantId,
      patientId
    );
  } catch (error) {
    throw new CustomError("Failed to check patient: " + error.message, 404);
  }
};

// Update patient
const updatePatient = async (patientId, data, tenant_id) => {
  const update = {
    ...patiendFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, update);
    const affectedRows = await patientModel.updatePatient(
      patientId,
      columns,
      values,
      tenant_id
    );
    if (affectedRows === 0) {
      throw new CustomError("Patient not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("patients:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update patient", 404);
  }
};

// Delete patient
const deletePatientByTenantIdAndPatientId = async (tenantId, patientId) => {
  try {
    const affectedRows = await patientModel.deletePatientByTenantIdAndPatientId(
      tenantId,
      patientId
    );
    if (affectedRows === 0) {
      throw new CustomError("Patient not found.", 404);
    }

    await invalidateCacheByPattern("patients:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete patient: ${error.message}`, 404);
  }
};

const updateToothDetails = async (data, patientId, tenant_id) => {
  console.log(data);
  data = data.length > 0 ? JSON.stringify(data) : null;
  try {
    const affectedRows = await patientModel.updateToothDetails(
      data,
      patientId,
      tenant_id
    );
    if (affectedRows === 0) {
      throw new CustomError("Patient not found.", 404);
    }

    await invalidateCacheByPattern("patients:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete patient: ${error.message}`, 404);
  }
};

module.exports = {
  createPatient,
  getAllPatientsByTenantId,
  getPatientByTenantIdAndPatientId,
  checkPatientExistsByTenantIdAndPatientId,
  updatePatient,
  deletePatientByTenantIdAndPatientId,
  updateToothDetails,
  // getTopPatientsByAppointmentPeriod,
  getMostVisitedPatientsByDentistPeriods,
  getMostVisitedPatientsByClinicPeriods,
  getNewPatientsTrends,
  getNewPatientsTrendsByDentistAndClinic,
  getAgeGenderByDentist,
  getAgeGenderByClinic
};
