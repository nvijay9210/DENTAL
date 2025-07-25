const { CustomError } = require("../middlewares/CustomeError");
const moment = require("moment");
const pool = require("../config/db");
const patientModel = require("../models/PatientModel");
const {
  redisClient,
  invalidateCacheByPattern,
  getOrSetCache,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const {
  addUser,
  getUserIdByUsername,
  assignRealmRoleToUser,
  addUserToGroup,
} = require("../middlewares/KeycloakAdmin");
const { encrypt } = require("../middlewares/PasswordHash");
const { buildCacheKey } = require("../utils/RedisCache");
const { createPatientClinic } = require("./PatientClinicService");

const patiendFields = {
  tenant_id: (val) => val,
  keycloak_id: (val) => val,
  username: (val) => val,
  password: (val) => val,
  first_name: (val) => val,
  last_name: (val) => val,
  email: (val) => val || null,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val || null,
  date_of_birth: (val) => (val ? formatDateOnly(val) : null),
  gender: (val) => val,
  blood_group: (val) => val || null,
  address: (val) => val || null,
  city: (val) => val || null,
  state: (val) => val || null,
  country: (val) => val || null,
  pin_code: (val) => val || null,
  profession: (val) => val || null,
  referred_by: (val) => val || null,
  smoking_status: (val) => val,
  alcohol_consumption: (val) => val,
  emergency_contact_name: (val) => val || null,
  emergency_contact_number: (val) => val || null,
  insurance_provider: (val) => val || null,
  insurance_policy_number: (val) => val || null,
  insurance_policy_start_date: (val) => (val ? formatDateOnly(val) : null),
  insurance_policy_end_date: (val) => (val ? formatDateOnly(val) : null),
  profile_picture: (val) => val || null,
};

const patientFieldsReverseMap = {
  patient_id: (val) => val,
  tenant_id: (val) => val,
  keycloak_id: (val) => val,
  username: (val) => val,
  password: (val) => val,
  first_name: (val) => val,
  last_name: (val) => val,
  email: (val) => val,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val,
  date_of_birth: (val) => (val ? formatDateOnly(val) : null),
  gender: (val) => val,
  blood_group: (val) => val,
  address: (val) => helper.safeJsonParse(val),
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pin_code: (val) => val,
  profession: (val) => val,
  referred_by: (val) => val,
  treatment_history: helper.safeJsonParse,
  pre_history: helper.safeJsonParse,
  current_medication: helper.safeJsonParse,
  smoking_status: (val) => val,
  alcohol_consumption: (val) => val,
  emergency_contact_name: (val) => val,
  emergency_contact_number: (val) => val,
  insurance_provider: (val) => val,
  insurance_policy_number: (val) => val,
  insurance_policy_start_date: (val) => (val ? formatDateOnly(val) : null),
  insurance_policy_end_date: (val) => (val ? formatDateOnly(val) : null),
  profile_picture: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};

// Create patient
const createPatient = async (data, token, realm,user_clinic_id) => {
  const create = {
    ...patiendFields,
    created_by: (val) => val,
  };

  try {
    let userData;
    if (process.env.KEYCLOAK_POWER === "on") {
      // 1. Generate username/email
      const username = helper.generateUsername(
        data.first_name,
        data.phone_number
      );
      const email =
        data.email ||
        `${username}${helper.generateAlphanumericPassword()}@gmail.com`;

      userData = {
        username,
        email,
        "emailVerified": true,
        firstName: data.first_name,
        lastName: data.last_name,
        password: "1234", // For demo; use generateAlphanumericPassword() in production
      };

      // 2. Create Keycloak User
      const isUserCreated = await addUser(token, realm, userData);
      if (!isUserCreated)
        throw new CustomError("Keycloak user not created", 400);

      console.log("✅ Keycloak user created:", userData.username);

      // 3. Get User ID from Keycloak
      const userId = await getUserIdByUsername(token, realm, userData.username);
      if (!userId)
        throw new CustomError("Could not fetch Keycloak user ID", 400);

      console.log("🆔 Keycloak user ID fetched:", userData);

      // 4. Assign Role: 'patient'
      const roleAssigned = await assignRealmRoleToUser(
        token,
        realm,
        userId,
        "patient"
      );
      if (!roleAssigned)
        throw new CustomError("Failed to assign 'patient' role", 400);

      console.log("🩺 Assigned 'patient' role");

      console.log('data:',data)

      // 5. Optional: Add to Group (e.g., based on clinicId)
      if (user_clinic_id) {
        const groupName = `dental-${data.tenant_id}-${user_clinic_id}`;
        const groupAdded = await addUserToGroup(
          token,
          realm,
          userId,
          groupName
        );

        if (!groupAdded) {
          console.warn(`⚠️ Failed to add user to group: ${groupName}`);
        } else {
          console.log(`👥 Added to group: ${groupName}`);
        }
      }

      (data.keycloak_id = userId),
        (data.username = username),
        (data.password = encrypt(userData.password).content);
    }

    const { columns, values } = mapFields(data, create);
    const patientId = await patientModel.createPatient(
      "patient",
      columns,
      values
    );
    await invalidateCacheByPattern("patient:*");
    await invalidateCacheByPattern("patient:*");
    await invalidateCacheByPattern("patient:mostvisited:*");

    const patientclinicId=await createPatientClinic({patient_id:patientId,clinic_id:data.clinic_id,created_by:data.created_by})
    if(!patientclinicId) throw new CustomError('patientclinic not added',404)

    return {
      patientId,
      username: userData.username,
      password: userData.password,
    };
  } catch (error) {
    console.trace(error);
    throw new CustomError(`Failed to create patient: ${error.message}`, 404);
  }
};

const getAllPatientsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("patient", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });

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

    const convertedRows = patients.data.map((patient) =>
      helper.convertDbToFrontend(patient, patientFieldsReverseMap)
    );

    return { data: convertedRows, total: patients.total };
  } catch (error) {
    console.error(error);
    throw new CustomError("Database error while fetching patients", 404);
  }
};

const getMostVisitedPatientsByDentistPeriods = async (
  tenantId,
  dentistId,
  clinicId = null,
  topN = 5
) => {
  // Fetch all appointments for the dentist (and optionally clinic)
  const cacheData = `patient:mostvisit:tenant:${tenantId}:clinic:${clinicId}:dentist:${dentistId}`;
  const rows = await getOrSetCache(cacheData, async () => {
    const rows = await patientModel.getMostVisitedPatientsByDentistPeriods(
      tenantId,
      clinicId,
      dentistId
    );

    //console.log(rows)

    const now = moment().utc();
    const result = {};

    // --- Weekly Data for Current Month (1w-5w) ---
    const weeksInMonth = Math.ceil(now.daysInMonth() / 7);
    for (let w = 1; w <= weeksInMonth; w++) {
      const weekStart = now
        .clone()
        .startOf("month")
        .add((w - 1) * 7, "days");
      let weekEnd = weekStart.clone().add(6, "days").endOf("day");
      const monthEnd = now.clone().endOf("month");
      if (weekEnd.isAfter(monthEnd)) weekEnd = monthEnd;

      const filtered = rows.filter((row) => {
        const apptDate = moment(row.appointment_date).utc();
        return apptDate.isBetween(weekStart, weekEnd, null, "[]");
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
        datasets: [{ data }],
      };
    }

    // --- Monthly Data for Past 12 Months (1m = current, 12m = 11 months ago) ---
    for (let m = 1; m <= 12; m++) {
      const periodStart = now
        .clone()
        .startOf("month")
        .subtract(m - 1, "months");
      const periodEnd = periodStart.clone().endOf("month");

      const filtered = rows.filter((row) => {
        const apptDate = moment(row.appointment_date).utc();
        return apptDate.isBetween(periodStart, periodEnd, null, "[]");
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
        datasets: [{ data }],
      };
    }

    // --- Yearly Data for Past 4 Years (1y = current, 4y = 3 years ago) ---
    for (let y = 1; y <= 4; y++) {
      const periodStart = now
        .clone()
        .startOf("year")
        .subtract(y - 1, "years");
      const periodEnd = periodStart.clone().endOf("year");

      const filtered = rows.filter((row) => {
        const apptDate = moment(row.appointment_date).utc();
        return apptDate.isBetween(periodStart, periodEnd, null, "[]");
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
        datasets: [{ data }],
      };
    }

    return result;
  });
  return rows;
};

// const getMostVisitedPatientsByClinicPeriods = async (
//   tenantId,
//   clinicId,
//   topN = 5
// ) => {
//   // Fetch all appointments for the clinic

//   const cacheData = `patient:mostvisit:tenant:${tenantId}:clinic:${clinicId}`;

//   const rows = await getOrSetCache(cacheData, async () => {
//     const rows = await patientModel.getMostVisitedPatientsByClinicPeriods(
//       tenantId,
//       clinicId
//     );
//     const now = moment().utc();
//     const result = {};

//     // --- Weekly Data for Current Month (1w-5w) ---
//     const weeksInMonth = Math.ceil(now.daysInMonth() / 7);
//     for (let w = 1; w <= weeksInMonth; w++) {
//       const weekStart = now
//         .clone()
//         .startOf("month")
//         .add((w - 1) * 7, "days");
//       let weekEnd = weekStart.clone().add(6, "days").endOf("day");
//       const monthEnd = now.clone().endOf("month");
//       if (weekEnd.isAfter(monthEnd)) weekEnd = monthEnd;

//       const filtered = rows.filter((row) => {
//         const apptDate = moment(row.appointment_date).utc();
//         return apptDate.isBetween(weekStart, weekEnd, null, "[]");
//       });

//       const nameCount = {};
//       for (const row of filtered) {
//         nameCount[row.name] = (nameCount[row.name] || 0) + 1;
//       }
//       const sorted = Object.entries(nameCount).sort((a, b) => b[1] - a[1]);
//       const labels = sorted.slice(0, topN).map(([name]) => name);
//       const data = sorted.slice(0, topN).map(([, count]) => count);

//       result[`${w}w`] = {
//         labels,
//         datasets: [{ data }],
//       };
//     }

//     // --- Monthly Data for Past 12 Months (1m = current, 12m = 11 months ago) ---
//     for (let m = 1; m <= 12; m++) {
//       const periodStart = now
//         .clone()
//         .startOf("month")
//         .subtract(m - 1, "months");
//       const periodEnd = periodStart.clone().endOf("month");

//       const filtered = rows.filter((row) => {
//         const apptDate = moment(row.appointment_date).utc();
//         return apptDate.isBetween(periodStart, periodEnd, null, "[]");
//       });

//       const nameCount = {};
//       for (const row of filtered) {
//         nameCount[row.name] = (nameCount[row.name] || 0) + 1;
//       }
//       const sorted = Object.entries(nameCount).sort((a, b) => b[1] - a[1]);
//       const labels = sorted.slice(0, topN).map(([name]) => name);
//       const data = sorted.slice(0, topN).map(([, count]) => count);

//       result[`${m}m`] = {
//         labels,
//         datasets: [{ data }],
//       };
//     }

//     // --- Yearly Data for Past 4 Years (1y = current, 4y = 3 years ago) ---
//     for (let y = 1; y <= 4; y++) {
//       const periodStart = now
//         .clone()
//         .startOf("year")
//         .subtract(y - 1, "years");
//       const periodEnd = periodStart.clone().endOf("year");

//       const filtered = rows.filter((row) => {
//         const apptDate = moment(row.appointment_date).utc();
//         return apptDate.isBetween(periodStart, periodEnd, null, "[]");
//       });

//       const nameCount = {};
//       for (const row of filtered) {
//         nameCount[row.name] = (nameCount[row.name] || 0) + 1;
//       }
//       const sorted = Object.entries(nameCount).sort((a, b) => b[1] - a[1]);
//       const labels = sorted.slice(0, topN).map(([name]) => name);
//       const data = sorted.slice(0, topN).map(([, count]) => count);

//       result[`${y}y`] = {
//         labels,
//         datasets: [{ data }],
//       };
//     }

//     return result;
//   });
//   return rows;
// };

const getMostVisitedPatientsByClinicPeriods = async (
  tenant_id,
  clinic_id,
  startDate,
  endDate,
  dentist_id
) => {
  const cacheKey = buildCacheKey("patient", "mostvisitedpatients", {
    tenant_id,
    clinic_id,
    dentist_id,
    startDate,
    endDate,
  });
  try {
    const patients = await getOrSetCache(cacheKey, async () => {
      const patient = await patientModel.getMostVisitedPatientsByClinicPeriods(
        tenant_id,
        clinic_id,
        startDate,
        endDate,
        dentist_id
      );

      console.log("✅ Serving patients from DB and caching result");
      return patient;
    });
    return patients;
  } catch (error) {
    throw new CustomError("Failed to get patient: " + error.message, 404);
  }
};

const getNewPatientsTrends = async (tenantId, clinicId) => {
  const cacheData = `patient:newpatient:tenant:${tenantId}:clinic:${clinicId}`;
  const rows = await getOrSetCache(cacheData, async () => {
    const rows = await patientModel.getNewPatientsTrends(tenantId, clinicId);

    const now = moment().utc();
    const result = {};

    // --- 1w: Current week, daily counts (Mon-Sun) ---
    {
      const weekStart = now.clone().startOf("isoWeek");
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const data = [];
      for (let d = 0; d < 7; d++) {
        const dayStart = weekStart.clone().add(d, "days").startOf("day");
        const dayEnd = dayStart.clone().endOf("day");
        const count = rows.filter((row) => {
          const created = moment(row.created_time).utc();
          return created.isBetween(dayStart, dayEnd, null, "[]");
        }).length;
        data.push(count);
      }
      result["1w"] = { labels, datasets: [{ data }] };
    }

    // --- 2w, 3w, 4w: Weekly totals for last N weeks ---
    [2, 3, 4].forEach((nWeeks) => {
      const labels = [];
      const data = [];
      for (let w = nWeeks - 1; w >= 0; w--) {
        const weekStart = now.clone().startOf("isoWeek").subtract(w, "weeks");
        const weekEnd = weekStart.clone().endOf("isoWeek");
        const count = rows.filter((row) => {
          const created = moment(row.created_time).utc();
          return created.isBetween(weekStart, weekEnd, null, "[]");
        }).length;
        labels.push(`${nWeeks - w}w`);
        data.push(count);
      }
      result[`${nWeeks}w`] = { labels, datasets: [{ data }] };
    });

    // --- 2m to 12m: Monthly totals for last N months ---
    [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach((nMonths) => {
      const labels = [];
      const data = [];
      for (let m = nMonths - 1; m >= 0; m--) {
        const monthStart = now.clone().startOf("month").subtract(m, "months");
        const monthEnd = monthStart.clone().endOf("month");
        const count = rows.filter((row) => {
          const created = moment(row.created_time).utc();
          return created.isBetween(monthStart, monthEnd, null, "[]");
        }).length;
        labels.push(monthStart.format("MMM"));
        data.push(count);
      }
      result[`${nMonths}m`] = { labels, datasets: [{ data }] };
    });

    // --- 2y, 3y, 4y: Yearly totals for last N years ---
    [2, 3, 4].forEach((nYears) => {
      const labels = [];
      const data = [];
      for (let y = nYears - 1; y >= 0; y--) {
        const yearStart = now.clone().startOf("year").subtract(y, "years");
        const yearEnd = yearStart.clone().endOf("year");
        const count = rows.filter((row) => {
          const created = moment(row.created_time).utc();
          return created.isBetween(yearStart, yearEnd, null, "[]");
        }).length;
        labels.push(yearStart.format("YYYY"));
        data.push(count);
      }
      result[`${nYears}y`] = { labels, datasets: [{ data }] };
    });

    return result;
  });

  return rows;
};

const getNewPatientsTrendsByDentistAndClinic = async (
  tenantId,
  clinicId,
  dentist_id
) => {
  const cacheData = `patient:newpatient:tenant:${tenantId}:clinic:${clinicId}:dentist:${dentist_id}`;

  const rows = await getOrSetCache(cacheData, async () => {
    const rows = await patientModel.getNewPatientsTrendsByDentistAndClinic(
      tenantId,
      clinicId,
      dentist_id
    );
    const now = moment().utc();
    const result = {};

    // --- 1w: Current week, daily counts (Mon-Sun) ---
    {
      const weekStart = now.clone().startOf("isoWeek");
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const data = [];
      for (let d = 0; d < 7; d++) {
        const dayStart = weekStart.clone().add(d, "days").startOf("day");
        const dayEnd = dayStart.clone().endOf("day");
        const count = rows.filter((row) => {
          const created = moment(row.created_time).utc();
          return created.isBetween(dayStart, dayEnd, null, "[]");
        }).length;
        data.push(count);
      }
      result["1w"] = { labels, datasets: [{ data }] };
    }

    // --- 2w, 3w, 4w: Weekly totals for last N weeks ---
    [2, 3, 4].forEach((nWeeks) => {
      const labels = [];
      const data = [];
      for (let w = nWeeks - 1; w >= 0; w--) {
        const weekStart = now.clone().startOf("isoWeek").subtract(w, "weeks");
        const weekEnd = weekStart.clone().endOf("isoWeek");
        const count = rows.filter((row) => {
          const created = moment(row.created_time).utc();
          return created.isBetween(weekStart, weekEnd, null, "[]");
        }).length;
        labels.push(`${nWeeks - w}w`);
        data.push(count);
      }
      result[`${nWeeks}w`] = { labels, datasets: [{ data }] };
    });

    // --- 2m to 12m: Monthly totals for last N months ---
    [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach((nMonths) => {
      const labels = [];
      const data = [];
      for (let m = nMonths - 1; m >= 0; m--) {
        const monthStart = now.clone().startOf("month").subtract(m, "months");
        const monthEnd = monthStart.clone().endOf("month");
        const count = rows.filter((row) => {
          const created = moment(row.created_time).utc();
          return created.isBetween(monthStart, monthEnd, null, "[]");
        }).length;
        labels.push(monthStart.format("MMM"));
        data.push(count);
      }
      result[`${nMonths}m`] = { labels, datasets: [{ data }] };
    });

    // --- 2y, 3y, 4y: Yearly totals for last N years ---
    [2, 3, 4].forEach((nYears) => {
      const labels = [];
      const data = [];
      for (let y = nYears - 1; y >= 0; y--) {
        const yearStart = now.clone().startOf("year").subtract(y, "years");
        const yearEnd = yearStart.clone().endOf("year");
        const count = rows.filter((row) => {
          const created = moment(row.created_time).utc();
          return created.isBetween(yearStart, yearEnd, null, "[]");
        }).length;
        labels.push(yearStart.format("YYYY"));
        data.push(count);
      }
      result[`${nYears}y`] = { labels, datasets: [{ data }] };
    });

    return result;
  });
  return rows;
};

const getAgeGenderByDentist = async (tenantId, clinicId, dentistId) => {
  const cacheData = `patient:agegender:tenant:${tenantId}:clinic:${clinicId}:dentist:${dentistId}`;
  const rows = await getOrSetCache(cacheData, async () => {
    const patients = await patientModel.getAgeGenderByDentist(
      tenantId,
      clinicId,
      dentistId
    );

    const ageGroups = [
      { label: "2-12", min: 2, max: 12 },
      { label: "13-19", min: 13, max: 19 },
      { label: "20-35", min: 20, max: 35 },
      { label: "35-50", min: 36, max: 50 },
      { label: "50-70", min: 51, max: 70 },
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

    patients.forEach((patient) => {
      if (!patient.date_of_birth || !patient.gender) return;
      const age = getAge(patient.date_of_birth);
      const groupIdx = ageGroups.findIndex((g) => age >= g.min && age <= g.max);
      if (groupIdx === -1) return;

      const gender = patient.gender.toLowerCase();
      if (gender.startsWith("m")) {
        maleCounts[groupIdx]++;
      } else if (gender.startsWith("f")) {
        femaleCounts[groupIdx]++;
      }
    });

    return {
      labels: ageGroups.map((g) => g.label),
      datasets: [
        {
          label: "Male",
          data: maleCounts,
        },
        {
          label: "Female",
          data: femaleCounts,
        },
      ],
    };
  });
  return rows;
};

const getAgeGenderByClinic = async (tenantId, clinicId) => {
  const cacheData = `patient:agegender:tenant:${tenantId}:clinic:${clinicId}`;
  const rows = await getOrSetCache(cacheData, async () => {
    const patients = await patientModel.getAgeGenderByClinic(
      tenantId,
      clinicId
    );
    const ageGroups = [
      { label: "2-12", min: 2, max: 12 },
      { label: "13-19", min: 13, max: 19 },
      { label: "20-35", min: 20, max: 35 },
      { label: "35-50", min: 36, max: 50 },
      { label: "50-70", min: 51, max: 70 },
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

    patients.forEach((patient) => {
      if (!patient.date_of_birth || !patient.gender) return;
      const age = getAge(patient.date_of_birth);
      const groupIdx = ageGroups.findIndex((g) => age >= g.min && age <= g.max);
      if (groupIdx === -1) return;

      const gender = patient.gender.toLowerCase();
      if (gender.startsWith("m")) {
        maleCounts[groupIdx]++;
      } else if (gender.startsWith("f")) {
        femaleCounts[groupIdx]++;
      }
    });

    return {
      labels: ageGroups.map((g) => g.label),
      datasets: [
        {
          label: "Male",
          data: maleCounts,
        },
        {
          label: "Female",
          data: femaleCounts,
        },
      ],
    };
  });
  return rows;
};

const getPatientByTenantIdAndPatientId = async (tenantId, patientId) => {
  try {
    const patient = await patientModel.getPatientByTenantIdAndPatientId(
      tenantId,
      patientId
    );
    // console.log(patient);
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

    await invalidateCacheByPattern("patient:*");
    await invalidateCacheByPattern("patient:*");
    await invalidateCacheByPattern("patient:mostvisited:*");
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

    await invalidateCacheByPattern("patient:*");
    await invalidateCacheByPattern("patient:*");
    await invalidateCacheByPattern("patient:mostvisited:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete patient: ${error.message}`, 404);
  }
};

// async function groupToothProceduresByTimeRangeCumulative(
//   tenantId,
//   clinicId,
//   startDate,
//   endDate,
//   dentistId
// ) {
//   const cacheData = `patient:toothdetails:tenant:${tenantId}:clinic:${clinicId}`;
//   const rows = await getOrSetCache(cacheData, async () => {
//     const dbInput =
//       await patientModel.groupToothProceduresByTimeRangeCumulative(
//         tenantId,
//   clinicId,
//   startDate,
//   endDate,
//   dentistId
//       );

//     const referenceDate = referenceDateStr
//       ? new Date(referenceDateStr)
//       : new Date();

//     const buckets = [
//       "1w",
//       "2w",
//       "3w",
//       "4w",
//       "1m",
//       "2m",
//       "3m",
//       "4m",
//       "5m",
//       "6m",
//       "7m",
//       "8m",
//       "9m",
//       "10m",
//       "11m",
//       "12m",
//       "1y",
//       "2y",
//       "3y",
//       "4y",
//     ];

//     function getTimeRange(diffDays) {
//       if (diffDays <= 7) return "1w";
//       if (diffDays <= 14) return "2w";
//       if (diffDays <= 21) return "3w";
//       if (diffDays <= 28) return "4w";

//       const months = Math.floor(diffDays / 30);
//       if (months >= 1 && months <= 12) return `${months}m`;

//       const years = Math.floor(diffDays / 365);
//       if (years >= 1 && years <= 4) return `${years}y`;

//       return null;
//     }

//     // Step 1: Parse all records and flatten tooth details
//     const allToothDetails = dbInput
//       .map((record) => {
//         try {
//           return JSON.parse(record.tooth_details);
//         } catch (e) {
//           return []; // fallback if JSON invalid
//         }
//       })
//       .flat()
//       .filter((item) => item != null); // filter out null or undefined entries

//     const rawCounts = {};
//     const allTypesSet = new Set();

//     // Step 2: Count each procedure by its time range, only past dates
//     allToothDetails.forEach((item) => {
//       if (!item) return; // safety check
//       const { date, type, selected } = item;
//       if (!selected || !type || !date) return;

//       const procedureDate = new Date(date);
//       const diffTime = referenceDate - procedureDate; // No Math.abs() to keep direction
//       if (diffTime < 0) return; // Ignore future dates

//       const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
//       const range = getTimeRange(diffDays);

//       if (!range) return;

//       allTypesSet.add(type);

//       if (!rawCounts[range]) rawCounts[range] = {};
//       if (!rawCounts[range][type]) rawCounts[range][type] = 0;

//       rawCounts[range][type]++;
//     });

//     // Step 3: Build cumulative results
//     const result = {};
//     buckets.forEach((b) => (result[b] = {}));

//     for (let i = 0; i < buckets.length; i++) {
//       const bucket = buckets[i];
//       const currentCounts = rawCounts[bucket] || {};

//       // Copy previous cumulative values
//       if (i > 0) {
//         for (const [type, count] of Object.entries(result[buckets[i - 1]])) {
//           result[bucket][type] = (result[bucket][type] || 0) + count;
//         }
//       }

//       // Add current counts
//       for (const [type, count] of Object.entries(currentCounts)) {
//         result[bucket][type] = (result[bucket][type] || 0) + count;
//       }
//     }

//     // Optional: Remove empty buckets
//     for (const bucket of Object.keys(result)) {
//       if (Object.keys(result[bucket]).length === 0) {
//         delete result[bucket];
//       }
//     }

//     return {
//       types: Array.from(allTypesSet),
//       cumulativeResult: result,
//     };
//   });
//   return rows;
// }

const groupToothProceduresByTimeRangeCumulative = async (
  tenantId,
  clinicId,
  dentistId,
  startDate,
  endDate
) => {
  const cacheKey = buildCacheKey("patient", "toothdetails", {
    tenant_id:tenantId,
    clinic_id:clinicId,
    dentist_id:dentistId,
    startDate,
    endDate,
  });

  try {
    const patients = await getOrSetCache(cacheKey, async () => {
      const result =
        await patientModel.groupToothProceduresByTimeRangeCumulative(
          tenantId,
          clinicId,
          startDate,
          endDate,
          dentistId
        );
      console.log("✅ Serving patients from DB and caching result");
      return result;
    });

    return patients;
  } catch (error) {
    console.error(error);
    throw new CustomError("Database error while fetching patients", 404);
  }
};

async function groupToothProceduresByTimeRangeCumulativeByDentist(
  tenant_id,
  clinic_id,
  dentist_id,
  referenceDateStr = null
) {
  const cacheData = `patient:toothdetails:tenant:${tenant_id}:clinic:${clinic_id}:dentist:${dentist_id}`;
  const rows = await getOrSetCache(cacheData, async () => {
    const dbInput =
      await patientModel.groupToothProceduresByTimeRangeCumulativeByDentist(
        tenant_id,
        clinic_id,
        dentist_id
      );

    const referenceDate = referenceDateStr
      ? new Date(referenceDateStr)
      : new Date();

    const buckets = [
      "1w",
      "2w",
      "3w",
      "4w",
      "1m",
      "2m",
      "3m",
      "4m",
      "5m",
      "6m",
      "7m",
      "8m",
      "9m",
      "10m",
      "11m",
      "12m",
      "1y",
      "2y",
      "3y",
      "4y",
    ];

    function getTimeRange(diffDays) {
      if (diffDays <= 7) return "1w";
      if (diffDays <= 14) return "2w";
      if (diffDays <= 21) return "3w";
      if (diffDays <= 28) return "4w";

      const months = Math.floor(diffDays / 30);
      if (months >= 1 && months <= 12) return `${months}m`;

      const years = Math.floor(diffDays / 365);
      if (years >= 1 && years <= 4) return `${years}y`;

      return null;
    }

    // Step 1: Parse all records and flatten tooth details
    const allToothDetails = dbInput
      .map((record) => {
        try {
          return JSON.parse(record.tooth_details);
        } catch (e) {
          return []; // fallback if JSON invalid
        }
      })
      .flat()
      .filter((item) => item != null); // filter out null or undefined entries

    const rawCounts = {};
    const allTypesSet = new Set();

    // Step 2: Count each procedure by its time range, only past dates
    allToothDetails.forEach((item) => {
      if (!item) return; // safety check
      const { date, type, selected } = item;
      if (!selected || !type || !date) return;

      const procedureDate = new Date(date);
      const diffTime = referenceDate - procedureDate; // No Math.abs() to keep direction
      if (diffTime < 0) return; // Ignore future dates

      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const range = getTimeRange(diffDays);

      if (!range) return;

      allTypesSet.add(type);

      if (!rawCounts[range]) rawCounts[range] = {};
      if (!rawCounts[range][type]) rawCounts[range][type] = 0;

      rawCounts[range][type]++;
    });

    // Step 3: Build cumulative results
    const result = {};
    buckets.forEach((b) => (result[b] = {}));

    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      const currentCounts = rawCounts[bucket] || {};

      // Copy previous cumulative values
      if (i > 0) {
        for (const [type, count] of Object.entries(result[buckets[i - 1]])) {
          result[bucket][type] = (result[bucket][type] || 0) + count;
        }
      }

      // Add current counts
      for (const [type, count] of Object.entries(currentCounts)) {
        result[bucket][type] = (result[bucket][type] || 0) + count;
      }
    }

    // Optional: Remove empty buckets
    for (const bucket of Object.keys(result)) {
      if (Object.keys(result[bucket]).length === 0) {
        delete result[bucket];
      }
    }

    return {
      types: Array.from(allTypesSet),
      cumulativeResult: result,
    };
  });
  return rows;
}

const getAllPatientsByTenantIdAndClinicId = async (
  tenantId,
  clinic_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("patient", "list", {
    tenant_id: tenantId,
    clinic_id,
    page,
    limit,
  });

  try {
    const patients = await getOrSetCache(cacheKey, async () => {
      const result = await patientModel.getAllPatientsByTenantIdAndClinicId(
        tenantId,
        clinic_id,
        Number(limit),
        offset
      );
      console.log("✅ Serving patients from DB and caching result");
      return result;
    });

    const convertedRows = patients.data.map((row) => {
      const { clinic_id, ...patientFields } = row;

      const converted = helper.convertDbToFrontend(
        patientFields,
        patientFieldsReverseMap
      );

      return {
        ...converted,
        clinic_id, // keep original field as-is
      };
    });

    return {
      data: convertedRows,
      total: patients.total,
    };
  } catch (error) {
    console.error(error);
    throw new CustomError("Database error while fetching patients", 404);
  }
};
const getAllPatientsByTenantIdAndClinicIdAndDentistId = async (
  tenantId,
  clinic_id,
  dentist_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("patient", "list", {
    tenant_id: tenantId,
    clinic_id,
    dentist_id,
    page,
    limit,
  });

  try {
    const patients = await getOrSetCache(cacheKey, async () => {
      const result = await patientModel.getAllPatientsByTenantIdAndClinicIdAndDentistId(
        tenantId,
        clinic_id,
        dentist_id,
        Number(limit),
        offset
      );
      console.log("✅ Serving patients from DB and caching result");
      return result;
    });

    const convertedRows = patients.data.map((row) => {
      const { clinic_id, ...patientFields } = row;

      const converted = helper.convertDbToFrontend(
        patientFields,
        patientFieldsReverseMap
      );

      return {
        ...converted,
        clinic_id, // keep original field as-is
      };
    });

    return {
      data: convertedRows,
      total: patients.total,
    };
  } catch (error) {
    console.error(error);
    throw new CustomError("Database error while fetching patients", 404);
  }
};


const getAllPatientsByTenantIdAndClinicIdUsingAppointmentStatus = async (
  tenantId,
  clinic_id,
  dentist_id,
  page=1,
  limit=10
) => {
  const cacheKey = buildCacheKey("patient", "list", {
    tenant_id:tenantId,
    clinic_id:clinic_id,
    dentist_id
  });
  const offset = (page - 1) * limit;

  try {
    const patients = await getOrSetCache(cacheKey, async () => {
      const result =
        await patientModel.getAllPatientsByTenantIdAndClinicIdUsingAppointmentStatus(
          tenantId,
          clinic_id,
          dentist_id,
          Number(limit),
          offset
        );
      console.log("✅ Serving patients from DB and caching result");
      return result;
    });

    const convertedRows = patients.data.map((row) => {
      const { clinic_id, ...patientFields } = row;

      const converted = helper.convertDbToFrontend(
        patientFields,
        patientFieldsReverseMap
      );

      return {
        ...converted,
        clinic_id, // keep original field as-is
      };
    });

    return {
      data: convertedRows,
      total: patients.total,
    };
  } catch (error) {
    console.error(error);
    throw new CustomError("Database error while fetching patients", 404);
  }
};

module.exports = {
  createPatient,
  getAllPatientsByTenantId,
  getPatientByTenantIdAndPatientId,
  checkPatientExistsByTenantIdAndPatientId,
  updatePatient,
  deletePatientByTenantIdAndPatientId,
  // getTopPatientsByAppointmentPeriod,
  getMostVisitedPatientsByDentistPeriods,
  getMostVisitedPatientsByClinicPeriods,
  getNewPatientsTrends,
  getNewPatientsTrendsByDentistAndClinic,
  getAgeGenderByDentist,
  getAgeGenderByClinic,
  groupToothProceduresByTimeRangeCumulative,
  groupToothProceduresByTimeRangeCumulativeByDentist,
  getAllPatientsByTenantIdAndClinicId,
  getAllPatientsByTenantIdAndClinicIdAndDentistId,
  getAllPatientsByTenantIdAndClinicIdUsingAppointmentStatus
};
