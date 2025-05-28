const { CustomError } = require("../middlewares/CustomeError");
const moment = require('moment');
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

const getPeriodSummaryByPatient = async (tenantId, clinicId, dentistId) => {
  try {
    const rows = await patientModel.getPeriodSummaryByPatient(tenantId, clinicId, dentistId);
    const now = moment().utc();
    const result = {};
    const topN = 5;

    // --- Weekly Data for Current Month (1w-5w) ---
    let cumulativeWeekly = 0;
    const weeksInMonth = Math.ceil(now.daysInMonth() / 7);
    for (let w = 1; w <= weeksInMonth; w++) {
      const filtered = rows.filter(row => {
        const created = moment(row.created_time).utc();
        return (
          created.year() === now.year() &&
          created.month() === now.month() &&
          Math.ceil(created.date() / 7) === w
        );
      });

      const nameCount = {};
      for (const row of filtered) {
        nameCount[row.name] = (nameCount[row.name] || 0) + 1;
      }
      const sorted = Object.entries(nameCount).sort((a, b) => b[1] - a[1]);
      const labels = sorted.slice(0, topN).map(([name]) => name);
      const data = sorted.slice(0, topN).map(([, count]) => count);

      const thisWeekTotal = data.reduce((a, b) => a + b, 0);
      cumulativeWeekly += thisWeekTotal;

      result[`${w}w`] = {
        labels,
        datasets: [{ data }],
        cumulative: cumulativeWeekly
      };
    }

    // --- Monthly Data for Past 12 Months (1m-12m) ---
    let cumulativeMonthly = 0;
    for (let m = 1; m <= 12; m++) {
      const periodStart = now.clone().startOf('month').subtract(m - 1, 'months');
      const periodEnd = periodStart.clone().endOf('month');

      const filtered = rows.filter(row => {
        const created = moment(row.created_time).utc();
        return created.isBetween(periodStart, periodEnd, null, '[]');
      });

      const nameCount = {};
      for (const row of filtered) {
        nameCount[row.name] = (nameCount[row.name] || 0) + 1;
      }
      const sorted = Object.entries(nameCount).sort((a, b) => b[1] - a[1]);
      const labels = sorted.slice(0, topN).map(([name]) => name);
      const data = sorted.slice(0, topN).map(([, count]) => count);

      const thisMonthTotal = data.reduce((a, b) => a + b, 0);
      cumulativeMonthly += thisMonthTotal;

      result[`${m}m`] = {
        labels,
        datasets: [{ data }],
        cumulative: cumulativeMonthly
      };
    }

    // --- Yearly Data for Past 4 Years (1y-4y) ---
    let cumulativeYearly = 0;
    for (let y = 1; y <= 4; y++) {
      const periodStart = now.clone().startOf('year').subtract(y - 1, 'years');
      const periodEnd = periodStart.clone().endOf('year');

      const filtered = rows.filter(row => {
        const created = moment(row.created_time).utc();
        return created.isBetween(periodStart, periodEnd, null, '[]');
      });

      const nameCount = {};
      for (const row of filtered) {
        nameCount[row.name] = (nameCount[row.name] || 0) + 1;
      }
      const sorted = Object.entries(nameCount).sort((a, b) => b[1] - a[1]);
      const labels = sorted.slice(0, topN).map(([name]) => name);
      const data = sorted.slice(0, topN).map(([, count]) => count);

      const thisYearTotal = data.reduce((a, b) => a + b, 0);
      cumulativeYearly += thisYearTotal;

      result[`${y}y`] = {
        labels,
        datasets: [{ data }],
        cumulative: cumulativeYearly
      };
    }

    return result;
  } catch (error) {
    console.error("Error checking patient existence:", error);
    throw new Error("Database Query Error");
  }
};







// const getPeriodSummaryByPatient = async (tenantId, clinicId, dentistId, userInput) => {
//   try {
//     const rows = await patientModel.getPeriodSummaryByPatient(tenantId, clinicId, dentistId);

//     // Check for week input (e.g., '1w', '2w')
//     const weekMatch = /^(\d+)w$/i.exec(userInput);
//     // Check for month range input (e.g., '2m' means current + next month)
//     const monthMatch = /^(\d+)m$/i.exec(userInput);

//     if (weekMatch) {
//       // User wants a specific week of the current month
//       const weekNumber = parseInt(weekMatch[1], 10);
//       const currentMonth = moment().format("MMMM");

//       let count = 0;
//       for (const row of rows) {
//         const created = moment(row.created_time);
//         if (created.format("MMMM") === currentMonth && Math.ceil(created.date() / 7) === weekNumber) {
//           count += 1;
//         }
//       }

//       return [{
//         period: 'weekly',
//         month: currentMonth,
//         week: `Week ${weekNumber}`,
//         count,
//       }];
//     } else if (monthMatch) {
//       // User wants a range: current month + (n-1) months
//       const monthRange = parseInt(monthMatch[1], 10);
//       const startMonth = moment().month(); // 0-indexed
//       const results = [];

//       for (let i = 0; i < monthRange; i++) {
//         const monthIndex = (startMonth + i) % 12;
//         const yearOffset = Math.floor((startMonth + i) / 12);
//         const monthName = moment().month(monthIndex).format("MMMM");
//         const year = moment().add(yearOffset, 'years').year();

//         let count = 0;
//         for (const row of rows) {
//           const created = moment(row.created_time);
//           if (created.month() === monthIndex && created.year() === year) {
//             count += 1;
//           }
//         }

//         results.push({
//           period: 'monthly',
//           month: monthName,
//           year,
//           count,
//         });
//       }

//       return results;
//     } else {
//       throw new Error("Invalid input. Use '1w', '2w', ..., '2m', '3m', ...");
//     }
//   } catch (error) {
//     console.error("Error fetching patient period summary:", error);
//     throw error;
//   }
// };




// Get single patient

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
  getPeriodSummaryByPatient
};
