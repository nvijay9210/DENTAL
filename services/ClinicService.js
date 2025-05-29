const { CustomError } = require("../middlewares/CustomeError");
const pool = require("../config/db");
const clinicModel = require("../models/ClinicModel");
const {
  invalidateCacheByPattern,
  getOrSetCache,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const helper = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const {
  updateClinicIdAndNameAndAddress,
  updateNullClinicInfoWithJoin,
} = require("../services/DentistService");

const message = require("../middlewares/ErrorMessages");

const clinicFieldMap = {
  tenant_id: (val) => val,
  clinic_name: (val) => val,
  email: (val) => val || null,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val || null,
  branch: (val) => val || null,
  website: (val) => val || null,
  address: (val) => JSON.stringify(val),
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pin_code: (val) => val,
  license_number: (val) => val,
  gst_number: (val) => val || null,
  pan_number: (val) => val || null,
  established_year: (val) => val,
  total_doctors: (val) => val ||0,
  total_patients: (val) => val ||0,
  seating_capacity: (val) => val ||0,
  number_of_assistants: (val) => val || 0,
  available_services: (val) => (val ? JSON.stringify(val) : null),
  operating_hours: (val) => (val ? JSON.stringify(val) : null),
  insurance_supported: helper.parseBoolean,
  ratings: (val) => val || 0,
  reviews_count: (val) => val || 0,
  emergency_support: helper.parseBoolean,
  teleconsultation_supported: helper.parseBoolean,
  clinic_logo: (val) => val || null,
  parking_availability: helper.parseBoolean,
  pharmacy: helper.parseBoolean,
  wifi: helper.parseBoolean,
};

const clinicFieldReverseMap = {
  clinic_id:val=>val,
  tenant_id: val => val,
  clinic_name: val => val,
  email: val => val,
  phone_number: val => val,
  alternate_phone_number: val => val,
  branch: val => val,
  website: val => val,
  address: val => helper.safeJsonParse(val),
  city: val => val,
  state: val => val,
  country: val => val,
  pin_code: val => val,
  license_number: val => val,
  gst_number: val => val,
  pan_number: val => val,
  established_year: val => parseInt(val) || 0,
  total_doctors: val => parseInt(val) || null,
  total_patients: val => parseInt(val) || null,
  seating_capacity: val => parseInt(val) || null,
  number_of_assistants: val => parseInt(val) || null,
  available_services: val => helper.safeJsonParse(val),
  operating_hours: val => helper.safeJsonParse(val),
  insurance_supported: val => Boolean(val),
  ratings: val => parseFloat(val) || 0,
  reviews_count: val => parseInt(val) || 0,
  emergency_support: val => Boolean(val),
  teleconsultation_supported: val => Boolean(val),
  clinic_logo: val => val,
  parking_availability: val => Boolean(val),
  pharmacy: val => Boolean(val),
  wifi: val => Boolean(val),
  created_by: val => val,
  created_time: val => val ? new Date(val).toISOString() : null,
  updated_by: val => val,
  updated_time: val => val ? new Date(val).toISOString() : null
};

// -------------------- CREATE --------------------
const createClinic = async (data) => {
  const createClinicFieldMap = {
    ...clinicFieldMap,
    created_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, createClinicFieldMap);
    const clinicId = await clinicModel.createClinic("clinic", columns, values);
    await invalidateCacheByPattern("clinics:*");
    return clinicId;
  } catch (error) {
    console.trace(error);
    throw new CustomError(message.CLINIC_CREATE_FAIL, 404);
  }
};

// -------------------- UPDATE --------------------
const updateClinic = async (clinicId, data, tenant_id) => {
  const updateClinicFieldMap = {
    ...clinicFieldMap,
    updated_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, updateClinicFieldMap);

    const affectedRows = await clinicModel.updateClinic(
      clinicId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError(message.CLINIC_UPDATE_FAIL, 404);
    }

    await invalidateCacheByPattern("clinics:*");
    return affectedRows;
  } catch (error) {
    console.log("Service Error:", error);
    throw new CustomError(message.CLINICS_FETCH_FAIL, 404);
  }
};

// -------------------- GET ALL --------------------
const getAllClinicsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `clinics:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const clinics = await getOrSetCache(cacheKey, async () => {
      const result = await clinicModel.getAllClinicsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });
  const convertedRows = clinics.map(clinic => helper.convertDbToFrontend(clinic, clinicFieldReverseMap));

    return convertedRows;
  } catch (err) {
    console.error(err);
    throw new CustomError(message.CLINICS_FETCH_FAIL, 404);
  }
};

// -------------------- GET SINGLE --------------------
const getClinicByTenantIdAndClinicId = async (tenantId, clinicId) => {

  try {
    const clinic = await clinicModel.getClinicByTenantIdAndClinicId(
      tenantId,
      clinicId
    );
   
    const convertedRows = helper.convertDbToFrontend(clinic, clinicFieldReverseMap);

    return convertedRows;

  } catch (error) {
    throw new CustomError(message.CLINIC_FETCH_FAIL, 404);
  }
};

const deleteClinicByTenantIdAndClinicId = async (tenantId, clinicId) => {
  try {
    const clinic = await clinicModel.deleteClinicByTenantIdAndClinicId(
      tenantId,
      clinicId
    );
    await invalidateCacheByPattern("clinics:*");
    return clinic;
  } catch (error) {
    throw new CustomError(message.CLINIC_DELETE_FAIL, 404);
  }
};

// -------------------- CHECK EXISTS --------------------
const checkClinicExistsByTenantIdAndClinicId = async (tenantId, clinicId) => {
  try {
    return await clinicModel.checkClinicExistsByTenantIdAndClinicId(
      tenantId,
      clinicId
    );
  } catch (error) {
    throw new CustomError(message.CLINIC_CREATE_FAIL, 404);
  }
};

const handleClinicAssignment = async (
  tenantId,
  clinicId,
  details,
  assign = true
) => {
  try {
    if (assign === "true") {
      const clinic = await clinicModel.getClinicNameAndAddressByClinicId(
        tenantId,
        clinicId
      );

      const dentistIds = details?.dentist_id;
      if (!Array.isArray(dentistIds) || dentistIds.length === 0) {
        throw new CustomError("At least one dentistId is required", 404);
      }

      const updatedDentists = await Promise.all(
        dentistIds.map((dentistId) =>
          updateClinicIdAndNameAndAddress(
            tenantId,
            clinicId,
            clinic.clinic_name,
            clinic.address,
            dentistId
          )
        )
      );

      await clinicModel.updateDoctorCount(tenantId, clinicId, assign);
      await invalidateCacheByPattern("clinics:*");

      return "Dentists Added Successfully";
    } else {
      const dentistIds = details?.dentist_id;
      if (!Array.isArray(dentistIds) || dentistIds.length === 0) {
        throw new CustomError("At least one dentistId is required", 404);
      }

      await Promise.all(
        dentistIds.map((dentistId) =>
          updateNullClinicInfoWithJoin(tenantId, clinicId, dentistId)
        )
      );

      await clinicModel.updateDoctorCount(tenantId, clinicId, assign);
      await invalidateCacheByPattern("clinics:*");

      return "Dentists Removed Successfully";
    }
  } catch (error) {
    console.error("Error in handleClinicAssignment:", error);
    throw new CustomError(
      `Failed to update clinic assignment: ${error.message}`,
      404
    );
  }
};


const getFinanceSummary = async (tenant_id, clinic_id, usePaymentTable = false) => {
  let conn;
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  try {
    conn = await pool.getConnection();

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize date

    // Helper functions
    const aggregateByWeek = (raw, base, count) => {
      const arr = Array(count).fill(0);
      raw.forEach(row => {
        const idx = Math.floor((row.date - base) / (7 * 24 * 60 * 60 * 1000));
        if (idx >= 0 && idx < count) arr[idx] += row.amount;
      });
      return arr.map((amount, i) => ({ label: `Week ${i + 1}`, amount }));
    };

    const aggregateByMonthName = (raw, yearRef) => {
      const arr = Array(12).fill(0);
      raw.forEach(row => {
        const year = row.date.getFullYear();
        const monthIndex = row.date.getMonth();
        if (year === yearRef) {
          arr[monthIndex] += row.amount;
        }
      });
      return monthNames.map((name, i) => ({ label: name, amount: arr[i] }));
    };

    // Fetch raw data
    let [appointments, treatments, expenses, payments] = await Promise.all([
      usePaymentTable ? [] : conn.query(
        `SELECT appointment_date AS date, (consultation_fee - discount_applied) AS amount FROM appointment 
         WHERE status = 'CP' AND appointment_date >= ? AND tenant_id = ? AND clinic_id = ?`,
        [new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000), tenant_id, clinic_id]
      ),
      usePaymentTable ? [] : conn.query(
        `SELECT treatment_date AS date, cost AS amount FROM treatment 
         WHERE treatment_date >= ? AND tenant_id = ? AND clinic_id = ?`,
        [new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000), tenant_id, clinic_id]
      ),
      conn.query(
        `SELECT expense_date AS date, expense_amount AS amount FROM expense 
         WHERE expense_date >= ? AND tenant_id = ? AND clinic_id = ?`,
        [new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000), tenant_id, clinic_id]
      ),
      usePaymentTable ? conn.query(
        `SELECT payment_date AS date, amount AS amount FROM payment 
         WHERE payment_date >= ? AND tenant_id = ? AND clinic_id = ?`,
        [new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000), tenant_id, clinic_id]
      ) : []
    ]);

    appointments = usePaymentTable ? [] : appointments[0];
    treatments = usePaymentTable ? [] : treatments[0];
    expenses = expenses[0];
    payments = payments.length > 0 ? payments[0] : [];
    
    console.log("appointments", "treatments", "expenses", "payments",appointments, treatments, expenses, payments)

    // Convert to uniform format
    const incomeRaw = usePaymentTable
      ? payments.map(row => ({
          date: new Date(row.date),
          amount: parseFloat(row.amount || 0)
        }))
      : [...appointments, ...treatments].map(row => ({
          date: new Date(row.date),
          amount: parseFloat(row.amount || 0)
        }));

    const expenseRaw = expenses.map(row => ({
      date: new Date(row.date),
      amount: parseFloat(row.amount || 0)
    }));

    const summary = {};

    // --- Weekly Aggregation (Last 4 Weeks) ---
let currentSunday = new Date(now);
currentSunday.setDate(now.getDate() - now.getDay());

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weeksLabelMap = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

// For cumulative totals
let cumIncomeByWeek = [0, 0, 0, 0];
let cumExpenseByWeek = [0, 0, 0, 0];

for (let w = 1; w <= 4; w++) {
  const weekBase = new Date(currentSunday);
  weekBase.setDate(currentSunday.getDate() - 7 * (w - 1));

  const weekStart = new Date(weekBase);
  const weekEnd = new Date(weekBase);
  weekEnd.setDate(weekBase.getDate() + 6);

  // Filter income/expense in this week
  const weekIncome = incomeRaw.filter(i => i.date >= weekStart && i.date <= weekEnd);
  const weekExpense = expenseRaw.filter(e => e.date >= weekStart && e.date <= weekEnd);

  // Group by weekday
  const incomeByDay = Array(7).fill(0);
  const expenseByDay = Array(7).fill(0);

  weekIncome.forEach(i => {
    const dayIndex = i.date.getDay(); // 0=Sunday
    incomeByDay[dayIndex] += i.amount;
  });

  weekExpense.forEach(e => {
    const dayIndex = e.date.getDay();
    expenseByDay[dayIndex] += e.amount;
  });

  // Store full weekday breakdown for "1w"
  summary["1w"] = {
    income: daysOfWeek.map((label, i) => ({ label, amount: incomeByDay[i] })),
    expense: daysOfWeek.map((label, i) => ({ label, amount: expenseByDay[i] }))
  };

  // Build cumulative week data
  let totalIncome = weekIncome.reduce((sum, i) => sum + i.amount, 0);
  let totalExpense = weekExpense.reduce((sum, e) => sum + e.amount, 0);

  cumIncomeByWeek[w - 1] = (cumIncomeByWeek[w - 2] || 0) + totalIncome;
  cumExpenseByWeek[w - 1] = (cumExpenseByWeek[w - 2] || 0) + totalExpense;

  // Build each bucket dynamically
  summary[`${w}w`] = {
    income: weeksLabelMap.slice(0, w).map((label, i) => ({
      label,
      amount: cumIncomeByWeek[i]
    })),
    expense: weeksLabelMap.slice(0, w).map((label, i) => ({
      label,
      amount: cumExpenseByWeek[i]
    }))
  };
}

    // --- Monthly Aggregation (Last 12 Months) ---
    const cumulativeMonthlyIncome = Array(12).fill(0);
    const cumulativeMonthlyExpense = Array(12).fill(0);

    for (let m = 1; m <= 12; m++) {
      const refDate = new Date(now.getFullYear(), now.getMonth() - (m - 1), 1);
      const year = refDate.getFullYear();
      const month = refDate.getMonth();

      const monthIncome = incomeRaw
        .filter(i => i.date.getFullYear() === year && i.date.getMonth() === month)
        .reduce((sum, i) => sum + i.amount, 0);

      const monthExpense = expenseRaw
        .filter(e => e.date.getFullYear() === year && e.date.getMonth() === month)
        .reduce((sum, e) => sum + e.amount, 0);

      cumulativeMonthlyIncome[m - 1] = (cumulativeMonthlyIncome[m - 2] || 0) + monthIncome;
      cumulativeMonthlyExpense[m - 1] = (cumulativeMonthlyExpense[m - 2] || 0) + monthExpense;

      summary[`${m}m`] = {
        income: [{ label: monthNames[month], amount: cumulativeMonthlyIncome[m - 1] }],
        expense: [{ label: monthNames[month], amount: cumulativeMonthlyExpense[m - 1] }]
      };
    }

    // --- Yearly Aggregation (Last 4 Years) ---
    const cumulativeYearlyIncome = {};
    const cumulativeYearlyExpense = {};

    for (let y = 1; y <= 4; y++) {
      const yearRef = now.getFullYear() - (y - 1);

      const yearIncome = incomeRaw
        .filter(i => i.date.getFullYear() === yearRef)
        .reduce((sum, i) => sum + i.amount, 0);

      const yearExpense = expenseRaw
        .filter(e => e.date.getFullYear() === yearRef)
        .reduce((sum, e) => sum + e.amount, 0);

      cumulativeYearlyIncome[y] = (cumulativeYearlyIncome[y - 1] || 0) + yearIncome;
      cumulativeYearlyExpense[y] = (cumulativeYearlyExpense[y - 1] || 0) + yearExpense;

      summary[`${y}y`] = {
        income: [{ label: String(yearRef), amount: cumulativeYearlyIncome[y] }],
        expense: [{ label: String(yearRef), amount: cumulativeYearlyExpense[y] }]
      };
    }

    return summary;

  } finally {
    if (conn) conn.release();
  }
};

const getFinanceSummarybyDentist = async (tenant_id, clinic_id,dentist_id, usePaymentTable = false) => {
  let conn;
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  try {
    conn = await pool.getConnection();

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize date

    // Helper functions
    const aggregateByWeek = (raw, base, count) => {
      const arr = Array(count).fill(0);
      raw.forEach(row => {
        const idx = Math.floor((row.date - base) / (7 * 24 * 60 * 60 * 1000));
        if (idx >= 0 && idx < count) arr[idx] += row.amount;
      });
      return arr.map((amount, i) => ({ label: `Week ${i + 1}`, amount }));
    };

    const aggregateByMonthName = (raw, yearRef) => {
      const arr = Array(12).fill(0);
      raw.forEach(row => {
        const year = row.date.getFullYear();
        const monthIndex = row.date.getMonth();
        if (year === yearRef) {
          arr[monthIndex] += row.amount;
        }
      });
      return monthNames.map((name, i) => ({ label: name, amount: arr[i] }));
    };

    // Fetch raw data
    let [appointments, treatments, expenses, payments] = await Promise.all([
      usePaymentTable ? [] : conn.query(
        `SELECT appointment_date AS date, (consultation_fee - discount_applied) AS amount FROM appointment 
         WHERE status = 'CP' AND appointment_date >= ? AND tenant_id = ? AND clinic_id = ? AND dentist_id=?`,
        [new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000), tenant_id, clinic_id,dentist_id]
      ),
      usePaymentTable ? [] : conn.query(
        `SELECT treatment_date AS date, cost AS amount FROM treatment 
         WHERE treatment_date >= ? AND tenant_id = ? AND clinic_id = ? AND dentist_id=?`,
        [new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000), tenant_id, clinic_id,dentist_id]
      ),
      conn.query(
        `SELECT expense_date AS date, expense_amount AS amount FROM expense 
         WHERE expense_date >= ? AND tenant_id = ? AND clinic_id = ? AND dentist_id=?`,
        [new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000), tenant_id, clinic_id,dentist_id]
      ),
      usePaymentTable ? conn.query(
        `SELECT payment_date AS date, amount AS amount FROM payment 
         WHERE payment_date >= ? AND tenant_id = ? AND clinic_id = ? AND dentist_id=?`,
        [new Date(now.getTime() - 365 * 4 * 24 * 60 * 60 * 1000), tenant_id, clinic_id,dentist_id]
      ) : []
    ]);

    appointments = usePaymentTable ? [] : appointments[0];
    treatments = usePaymentTable ? [] : treatments[0];
    expenses = expenses[0];
    payments = payments.length > 0 ? payments[0] : [];
    
    console.log("appointments", "treatments", "expenses", "payments",appointments, treatments, expenses, payments)

    // Convert to uniform format
    const incomeRaw = usePaymentTable
      ? payments.map(row => ({
          date: new Date(row.date),
          amount: parseFloat(row.amount || 0)
        }))
      : [...appointments, ...treatments].map(row => ({
          date: new Date(row.date),
          amount: parseFloat(row.amount || 0)
        }));

    const expenseRaw = expenses.map(row => ({
      date: new Date(row.date),
      amount: parseFloat(row.amount || 0)
    }));

    const summary = {};

    // --- Weekly Aggregation (Last 4 Weeks) ---
let currentSunday = new Date(now);
currentSunday.setDate(now.getDate() - now.getDay());

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weeksLabelMap = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

// For cumulative totals
let cumIncomeByWeek = [0, 0, 0, 0];
let cumExpenseByWeek = [0, 0, 0, 0];

for (let w = 1; w <= 4; w++) {
  const weekBase = new Date(currentSunday);
  weekBase.setDate(currentSunday.getDate() - 7 * (w - 1));

  const weekStart = new Date(weekBase);
  const weekEnd = new Date(weekBase);
  weekEnd.setDate(weekBase.getDate() + 6);

  // Filter income/expense in this week
  const weekIncome = incomeRaw.filter(i => i.date >= weekStart && i.date <= weekEnd);
  const weekExpense = expenseRaw.filter(e => e.date >= weekStart && e.date <= weekEnd);

  // Group by weekday
  const incomeByDay = Array(7).fill(0);
  const expenseByDay = Array(7).fill(0);

  weekIncome.forEach(i => {
    const dayIndex = i.date.getDay(); // 0=Sunday
    incomeByDay[dayIndex] += i.amount;
  });

  weekExpense.forEach(e => {
    const dayIndex = e.date.getDay();
    expenseByDay[dayIndex] += e.amount;
  });

  // Store full weekday breakdown for "1w"
  summary["1w"] = {
    income: daysOfWeek.map((label, i) => ({ label, amount: incomeByDay[i] })),
    expense: daysOfWeek.map((label, i) => ({ label, amount: expenseByDay[i] }))
  };

  // Build cumulative week data
  let totalIncome = weekIncome.reduce((sum, i) => sum + i.amount, 0);
  let totalExpense = weekExpense.reduce((sum, e) => sum + e.amount, 0);

  cumIncomeByWeek[w - 1] = (cumIncomeByWeek[w - 2] || 0) + totalIncome;
  cumExpenseByWeek[w - 1] = (cumExpenseByWeek[w - 2] || 0) + totalExpense;

  // Build each bucket dynamically
  summary[`${w}w`] = {
    income: weeksLabelMap.slice(0, w).map((label, i) => ({
      label,
      amount: cumIncomeByWeek[i]
    })),
    expense: weeksLabelMap.slice(0, w).map((label, i) => ({
      label,
      amount: cumExpenseByWeek[i]
    }))
  };
}

    // --- Monthly Aggregation (Last 12 Months) ---
    const cumulativeMonthlyIncome = Array(12).fill(0);
    const cumulativeMonthlyExpense = Array(12).fill(0);

    for (let m = 1; m <= 12; m++) {
      const refDate = new Date(now.getFullYear(), now.getMonth() - (m - 1), 1);
      const year = refDate.getFullYear();
      const month = refDate.getMonth();

      const monthIncome = incomeRaw
        .filter(i => i.date.getFullYear() === year && i.date.getMonth() === month)
        .reduce((sum, i) => sum + i.amount, 0);

      const monthExpense = expenseRaw
        .filter(e => e.date.getFullYear() === year && e.date.getMonth() === month)
        .reduce((sum, e) => sum + e.amount, 0);

      cumulativeMonthlyIncome[m - 1] = (cumulativeMonthlyIncome[m - 2] || 0) + monthIncome;
      cumulativeMonthlyExpense[m - 1] = (cumulativeMonthlyExpense[m - 2] || 0) + monthExpense;

      summary[`${m}m`] = {
        income: [{ label: monthNames[month], amount: cumulativeMonthlyIncome[m - 1] }],
        expense: [{ label: monthNames[month], amount: cumulativeMonthlyExpense[m - 1] }]
      };
    }

    // --- Yearly Aggregation (Last 4 Years) ---
    const cumulativeYearlyIncome = {};
    const cumulativeYearlyExpense = {};

    for (let y = 1; y <= 4; y++) {
      const yearRef = now.getFullYear() - (y - 1);

      const yearIncome = incomeRaw
        .filter(i => i.date.getFullYear() === yearRef)
        .reduce((sum, i) => sum + i.amount, 0);

      const yearExpense = expenseRaw
        .filter(e => e.date.getFullYear() === yearRef)
        .reduce((sum, e) => sum + e.amount, 0);

      cumulativeYearlyIncome[y] = (cumulativeYearlyIncome[y - 1] || 0) + yearIncome;
      cumulativeYearlyExpense[y] = (cumulativeYearlyExpense[y - 1] || 0) + yearExpense;

      summary[`${y}y`] = {
        income: [{ label: String(yearRef), amount: cumulativeYearlyIncome[y] }],
        expense: [{ label: String(yearRef), amount: cumulativeYearlyExpense[y] }]
      };
    }

    return summary;

  } finally {
    if (conn) conn.release();
  }
};


module.exports = {
  createClinic,
  updateClinic,
  getAllClinicsByTenantId,
  getClinicByTenantIdAndClinicId,
  checkClinicExistsByTenantIdAndClinicId,
  deleteClinicByTenantIdAndClinicId,
  handleClinicAssignment,
  getFinanceSummary,
  getFinanceSummarybyDentist
};
