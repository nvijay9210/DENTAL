const { CustomError } = require("../middlewares/CustomeError");
const appointmentModel = require("../models/AppointmentModel");
const pool = require("../config/db");
const dayjs = require("dayjs");
const helper = require("../utils/Helpers");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const {
  decodeJsonFields,
  duration,
  safeJsonParse,
} = require("../utils/Helpers");
const { formatDateOnly, formatAppointments } = require("../utils/DateUtils");
const { mapFields } = require("../query/Records");
const { updatePatientCount } = require("../models/ClinicModel");
const { updatePatientAppointmentCount } = require("../models/PatientModel");
const { updateDentistAppointmentCount } = require("../models/DentistModel");

const appointmentFields = {
  tenant_id: (val) => val,
  patient_id: (val) => val,
  dentist_id: (val) => val,
  clinic_id: (val) => val,
  appointment_date: (val) => formatDateOnly(val),
  start_time: (val) => val,
  end_time: (val) => val,
  status: (val) => val,
  appointment_type: (val) => val,
  consultation_fee: (val) => val || null,
  discount_applied: (val) => val || 0.0,
  payment_status: (val) => val ,
  min_booking_fee: (val) => parseInt(val) ,
  paid_amount: (val) => parseInt(val) ,
  payment_method: (val) => val ,
  visit_reason: helper.safeStringify,
  follow_up_needed: (val) => Boolean(val),
  reminder_method: (val) => val || null,
  notes: helper.safeStringify,
  rescheduled_from:(val)=>val || null,
  cancelled_by:(val)=>val || null,
  cancellation_reason:helper.safeStringify,
  is_virtual:helper.parseBoolean,
  reminder_sent:helper.parseBoolean,
  meeting_link:(val)=>val || null,
  checkin_time:(val)=>val || null,
  checkout_time:(val)=>val || null
};

const appointmentFieldsReverseMap = {
  appointment_id:(val)=>val,
  tenant_id: (val) => val,
  patient_id: (val) => val,
  dentist_id: (val) => val,
  clinic_id: (val) => val,
  appointment_date: (val) => formatDateOnly(val),
  start_time: (val) => duration(val),
  end_time: (val) => duration(val),
  status: (val) => val,
  appointment_type: (val) => val,
  consultation_fee: (val) => val,
  discount_applied: (val) => val || 0.0,
  payment_status: (val) => val,
  min_booking_fee: (val) => parseInt(val) ,
  paid_amount: (val) => parseInt(val) ,
  payment_method: (val) => val,
  visit_reason: (val) => (val ? safeJsonParse(val) : null),
  follow_up_needed: (val) => Boolean(val),
  reminder_method: (val) => val,
  notes: (val) => (val ? safeJsonParse(val) : null),
  rescheduled_from:(val)=>val || null,
  cancelled_by:(val)=>val || null,
  cancellation_reason:helper.safeJsonParse,
  is_virtual:(val) => Boolean(val),
  reminder_sent:(val) => Boolean(val),
  meeting_link:(val)=>val || null,
  checkin_time:(val)=>val || null,
  checkout_time:(val)=>val || null,
  created_by: (val) => val,
  created_time: (val) => (val ? new Date(val).toISOString() : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? new Date(val).toISOString() : null),
};

// Create Appointment
const createAppointment = async (data) => {
  const fieldMap = {
    ...appointmentFields,
    created_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, fieldMap);
    const appointmentId = await appointmentModel.createAppointment(
      "appointment",
      columns,
      values
    );
    await invalidateCacheByPattern("appointment:*");
    await invalidateCacheByPattern("appointmentsdetails:*");
    await invalidateCacheByPattern("patientvisitdetails:*");
    await invalidateCacheByPattern("appointmentsmonthlysummary:*");
    if (appointmentId)
      await updatePatientCount(data.tenant_id, data.clinic_id, true);
      await updatePatientAppointmentCount(data.tenant_id, data.patient_id, true);
      await updateDentistAppointmentCount(data.tenant_id,data.clinic_id, data.dentist_id, true);
    return appointmentId;
  } catch (error) {
    console.error("Failed to create appointment:", error);
    throw new CustomError(
      `Failed to create appointment: ${error.message}`,
      404
    );
  }
};

// Get All Appointments by Tenant ID with Caching
const getAllAppointmentsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `appointment:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const appointments = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentModel.getAllAppointmentsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });
    const convertedRows = appointments.map((appointment) =>
      helper.convertDbToFrontend(appointment, appointmentFieldsReverseMap)
    );

    return convertedRows;
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

const getAllAppointmentsByTenantIdAndClinicId = async (tenantId,clinic_id, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `appointment:${tenantId}:clinicid:${clinic_id}:page:${page}:limit:${limit}`;

  try {
    const appointments = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentModel.getAllAppointmentsByTenantIdAndClinicId(
        tenantId,
        clinic_id,
        Number(limit),
        offset
      );
      return result;
    });
    const convertedRows = appointments.map((appointment) =>
      helper.convertDbToFrontend(appointment, appointmentFieldsReverseMap)
    );

    return convertedRows;
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

const getAllAppointmentsByTenantIdAndClinicIdByDentist = async (tenantId,clinic_id,dentist_id, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `appointment:${tenantId}:clinicid:${clinic_id}:dentist:${dentist_id}:page:${page}:limit:${limit}`;

  try {
    const appointments = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentModel.getAllAppointmentsByTenantIdAndClinicIdByDentist(
        tenantId,
        clinic_id,
        dentist_id,
        Number(limit),
        offset
      );
      return result;
    });
    const convertedRows = appointments.map((appointment) =>
      helper.convertDbToFrontend(appointment, appointmentFieldsReverseMap)
    );

    return convertedRows;
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

// Get Appointment by Tenant & ID
const getAppointmentByTenantIdAndAppointmentId = async (
  tenantId,
  appointmentId
) => {
  try {
    const appointment =
      await appointmentModel.getAppointmentByTenantIdAndAppointmentId(
        tenantId,
        appointmentId
      );
    
      const convertedRows = 
        helper.convertDbToFrontend(appointment, appointmentFieldsReverseMap)
      
  
      return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get appointment: " + error.message, 404);
  }
};

// Update Appointment
const updateAppointment = async (appointmentId, data, tenant_id) => {
  const fieldMap = {
    ...appointmentFields,
    updated_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await appointmentModel.updateAppointment(
      appointmentId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Appointment not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("appointment:*");
    await invalidateCacheByPattern("appointmentsdetails:*");
    await invalidateCacheByPattern("patientvisitdetails:*");
    await invalidateCacheByPattern("appointmentsmonthlysummary:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update appointment", 404);
  }
};
const updateAppoinmentStatusCancelled = async (appointment_id,tenant_id,
  clinic_id) => {

  try {
    const affectedRows = await appointmentModel.updateAppoinmentStatusCancelled(
      appointment_id,
      tenant_id,
      clinic_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Appointment not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("appointment:*");
    await invalidateCacheByPattern("appointmentsdetails:*");
    await invalidateCacheByPattern("patientvisitdetails:*");
    await invalidateCacheByPattern("appointmentsmonthlysummary:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update appointment", 404);
  }
};

// Delete Appointment
const deleteAppointmentByTenantIdAndAppointmentId = async (
  tenantId,
  appointmentId
) => {
  try {
    const affectedRows =
      await appointmentModel.deleteAppointmentByTenantIdAndAppointmentId(
        tenantId,
        appointmentId
      );
    if (affectedRows === 0) {
      throw new CustomError("Appointment not found.", 404);
    }

    await invalidateCacheByPattern("appointment:*");
    await invalidateCacheByPattern("appointmentsdetails:*");
    await invalidateCacheByPattern("patientvisitdetails:*");
    await invalidateCacheByPattern("appointmentsmonthlysummary:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete appointment: ${error.message}`,
      404
    );
  }
};

// Optional: Helper for checking overlapping appointment
const checkAppointmentExistsByStartTimeAndEndTimeAndDate = async (
  tenantId,
  clinic_id,
  patient_id,
  dentist_id,
  details,
  appointment_id = null
) => {
  try {
    return await appointmentModel.checkAppointmentExistsByStartTimeAndEndTimeAndDate(
      tenantId,
      clinic_id,
      patient_id,
      dentist_id,
      details,
      appointment_id
    );
  } catch (error) {
    throw new CustomError("Failed to check overlapping appointment", 404);
  }
};

const getAppointmentsWithDetails = async (
  tenantId,
  clinic_id,
  dentist_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `appointmentsdetails:${tenantId}/${clinic_id}/${dentist_id}:page:${page}:limit:${limit}`;
  const fieldsToDecode = ["visit_reason"];

  try {
    const appointment = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentModel.getAppointmentsWithDetails(
        tenantId,
        clinic_id,
        dentist_id,
        Number(limit),
        offset
      );

      const formatted = await formatAppointments(result); // ✅ Use the returned value
      return decodeJsonFields(formatted, fieldsToDecode); // ✅ Pass formatted data
    });

    return appointment;
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

const getAppointmentMonthlySummary = async (
  tenantId,
  clinic_id,
  dentist_id
) => {
  try {
    const cacheKey = `appointmentsmonthlysummary:${tenantId}/${clinic_id}/${dentist_id}`;
    const appointment = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentModel.getAppointmentMonthlySummary(
        tenantId,
        clinic_id,
        dentist_id
      );
      return result; // 🔁 Important: return from cache function
    });

    return appointment;
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

// const getAppointmentSummaryByDentist = async (
//   tenant_id,
//   clinic_id,
//   dentist_id,
//   period = 'monthly'
// ) => {
//   const conn = await pool.getConnection();

//   try {
//     const rows = await appointmentModel.getAllAppointmentsByTenantIdAndClinicIdAndDentistId(tenant_id,
//       clinic_id,
//       dentist_id)

//     const summary = {};

//     if (period.toLowerCase() === 'monthly') {
//       // Group by year and month
//       for (const row of rows) {
//         const date = moment(row.appointment_date);
//         const year = date.year();
//         const month = date.format('MMMM');

//         if (!summary[year]) summary[year] = {};

//         if (!summary[year][month]) summary[year][month] = 1;
//         else summary[year][month]++;
//       }

//       // Format output
//       const formattedSummary = {};
//       for (const [year, months] of Object.entries(summary)) {
//         formattedSummary[year] = Object.entries(months).map(([month, count]) => ({
//           month,
//           count,
//         }));
//       }

//       return {
//         period: 'monthly',
//         summary: formattedSummary,
//       };
//     }

//     if (period.toLowerCase() === 'yearly') {
//       // Group by year only
//       for (const row of rows) {
//         const year = moment(row.appointment_date).year();
//         if (!summary[year]) summary[year] = 1;
//         else summary[year]++;
//       }

//       const formatted = Object.entries(summary).map(([year, count]) => ({
//         year: parseInt(year),
//         count,
//       }));

//       return {
//         period: 'yearly',
//         summary: { 'All Years': formatted },
//       };
//     }

//     throw new Error("Unsupported period. Use 'monthly' or 'yearly'.");

//   } catch (error) {
//     console.error("Error fetching appointment summary:", error);
//     throw new Error("Failed to fetch appointment summary");
//   } finally {
//     conn.release();
//   }
// };

const getPatientVisitDetailsByPatientIdAndTenantIdAndClinicId = async (
  tenantId,
  clinicId,
  patientId,
  page,
  limit
) => {
  try {
    const offset = (page - 1) * limit;
    const cacheKey = `patientvisitdetails:${tenantId}/${clinicId}/${patientId}`;
    const appointment = await getOrSetCache(cacheKey, async () => {
      const result =
        await appointmentModel.getPatientVisitDetailsByPatientIdAndTenantIdAndClinicId(
          tenantId,
          clinicId,
          patientId,
          limit,
          offset
        );
      return result; // 🔁 Important: return from cache function
    });

    return appointment;
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};


const isoWeek = require('dayjs/plugin/isoWeek');
dayjs.extend(isoWeek);

const getAppointmentSummary = async (tenant_id, clinic_id) => {
  const summary = {};

  const ranges = {
    weeks: Array.from({ length: 4 }, (_, i) => {
      const targetWeek = dayjs().subtract(i, 'week');
      return {
        label: `${i + 1}w`,
        from: targetWeek.startOf('week').toDate(),
        to: targetWeek.endOf('week').toDate()
      };
    }),

    months: Array.from({ length: 12 }, (_, i) => {
      const targetMonth = dayjs().subtract(i, 'month');
      return {
        label: `${i + 1}m`,
        from: targetMonth.startOf('month').toDate(),
        to: targetMonth.endOf('month').toDate()
      };
    }),

    years: Array.from({ length: 4 }, (_, i) => {
      const targetYear = dayjs().subtract(i, 'year');
      return {
        label: `${i + 1}y`,
        from: targetYear.startOf('year').toDate(),
        to: targetYear.endOf('year').toDate()
      };
    }),
  };

  const fetchDataForRange = async (from, to) => {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM appointment
       WHERE tenant_id = ? AND clinic_id = ? AND created_time BETWEEN ? AND ?
       GROUP BY status`,
      [tenant_id, clinic_id, from, to]
    );

    const result = {
      total_appointments: 0,
      completed_appointments: 0,
      pending_appointments: 0,
      cancelled_appointments: 0,
    };

    rows.forEach(row => {
      result.total_appointments += row.count;
      if (row.status === "CP") result.completed_appointments = row.count;
      else if (row.status === "SC") result.pending_appointments = row.count;
      else if (row.status === "CL") result.cancelled_appointments = row.count;
    });

    return {
      total_appointments: result.total_appointments,
      completed_appointments: result.completed_appointments.toString(),
      pending_appointments: result.pending_appointments.toString(),
      cancelled_appointments: result.cancelled_appointments.toString(),
    };
  };

  const mergeStats = (acc, newStats) => {
    acc.total_appointments += parseInt(newStats.total_appointments || 0);
    acc.completed_appointments += parseInt(newStats.completed_appointments || 0);
    acc.pending_appointments += parseInt(newStats.pending_appointments || 0);
    acc.cancelled_appointments += parseInt(newStats.cancelled_appointments || 0);
    return acc;
  };

  // Process each time range type
  for (const [periodType, items] of Object.entries(ranges)) {
    let cumulativeStats = {
      total_appointments: 0,
      completed_appointments: 0,
      pending_appointments: 0,
      cancelled_appointments: 0,
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const currentStats = await fetchDataForRange(item.from, item.to);

      // Merge into cumulative stats
      cumulativeStats = mergeStats({...cumulativeStats}, currentStats);

      // Save cumulative value directly under the label (e.g., "2w", "3m", "1y")
      summary[item.label] = {
        total_appointments: cumulativeStats.total_appointments,
        completed_appointments: cumulativeStats.completed_appointments.toString(),
        pending_appointments: cumulativeStats.pending_appointments.toString(),
        cancelled_appointments: cumulativeStats.cancelled_appointments.toString(),
      };
    }
  }

  return summary;
};

const getAppointmentSummaryByDentist = async (tenant_id, clinic_id,dentist_id) => {
  const summary = {};

  const ranges = {
    weeks: Array.from({ length: 4 }, (_, i) => {
      const targetWeek = dayjs().subtract(i, 'week');
      return {
        label: `${i + 1}w`,
        from: targetWeek.startOf('week').toDate(),
        to: targetWeek.endOf('week').toDate()
      };
    }),

    months: Array.from({ length: 12 }, (_, i) => {
      const targetMonth = dayjs().subtract(i, 'month');
      return {
        label: `${i + 1}m`,
        from: targetMonth.startOf('month').toDate(),
        to: targetMonth.endOf('month').toDate()
      };
    }),

    years: Array.from({ length: 4 }, (_, i) => {
      const targetYear = dayjs().subtract(i, 'year');
      return {
        label: `${i + 1}y`,
        from: targetYear.startOf('year').toDate(),
        to: targetYear.endOf('year').toDate()
      };
    }),
  };

  const fetchDataForRange = async (from, to) => {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM appointment
       WHERE tenant_id = ? AND clinic_id = ? AND dentist_id=? AND created_time BETWEEN ? AND ?
       GROUP BY status`,
      [tenant_id, clinic_id,dentist_id, from, to]
    );

    const result = {
      total_appointments: 0,
      completed_appointments: 0,
      pending_appointments: 0,
      cancelled_appointments: 0,
    };

    rows.forEach(row => {
      result.total_appointments += row.count;
      if (row.status === "CP") result.completed_appointments = row.count;
      else if (row.status === "SC") result.pending_appointments = row.count;
      else if (row.status === "CL") result.cancelled_appointments = row.count;
    });

    return {
      total_appointments: result.total_appointments,
      completed_appointments: result.completed_appointments.toString(),
      pending_appointments: result.pending_appointments.toString(),
      cancelled_appointments: result.cancelled_appointments.toString(),
    };
  };

  const mergeStats = (acc, newStats) => {
    acc.total_appointments += parseInt(newStats.total_appointments || 0);
    acc.completed_appointments += parseInt(newStats.completed_appointments || 0);
    acc.pending_appointments += parseInt(newStats.pending_appointments || 0);
    acc.cancelled_appointments += parseInt(newStats.cancelled_appointments || 0);
    return acc;
  };

  // Process each time range type
  for (const [periodType, items] of Object.entries(ranges)) {
    let cumulativeStats = {
      total_appointments: 0,
      completed_appointments: 0,
      pending_appointments: 0,
      cancelled_appointments: 0,
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const currentStats = await fetchDataForRange(item.from, item.to);

      // Merge into cumulative stats
      cumulativeStats = mergeStats({...cumulativeStats}, currentStats);

      // Save cumulative value directly under the label (e.g., "2w", "3m", "1y")
      summary[item.label] = {
        total_appointments: cumulativeStats.total_appointments,
        completed_appointments: cumulativeStats.completed_appointments.toString(),
        pending_appointments: cumulativeStats.pending_appointments.toString(),
        cancelled_appointments: cumulativeStats.cancelled_appointments.toString(),
      };
    }
  }

  return summary;
};

const getAppointmentSummaryChartByClinic = async (tenant_id, clinic_id) => {
  const fetchDataForRange = async (from, to) => {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM appointment
       WHERE tenant_id = ? AND clinic_id = ? AND created_time BETWEEN ? AND ?
       GROUP BY status`,
      [tenant_id, clinic_id, from, to]
    );

    const result = { CP: 0, SC: 0, CL: 0 };
    rows.forEach(row => {
      result[row.status] = row.count;
    });

    return result.CP + result.SC + result.CL;
  };

  const now = dayjs();

  // === Daily data for current week (Mon - Sun) - already newest to oldest (today first) ===
  const weekStart = now.startOf("week");
  const weekData = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = weekStart.add(i, "day").startOf("day").toDate();
    const dayEnd = weekStart.add(i, "day").endOf("day").toDate();
    const total = await fetchDataForRange(dayStart, dayEnd);
    weekData.push(total);
  }

  // === Weekly totals (4 weeks): newest -> oldest ===
  const fourWeeks = [];
  for (let i = 0; i < 4; i++) {
    const from = now.subtract(i, "week").startOf("week").toDate();
    const to = now.subtract(i, "week").endOf("week").toDate();
    const total = await fetchDataForRange(from, to);
    fourWeeks.push(total); // [this week, last week, ...]
  }

  // === Monthly totals (12 months): newest -> oldest ===
  const monthTotals = [];
  for (let i = 0; i < 12; i++) {
    const from = now.subtract(i, "month").startOf("month").toDate();
    const to = now.subtract(i, "month").endOf("month").toDate();
    const total = await fetchDataForRange(from, to);
    monthTotals.push(total); // [current month, last month, ...]
  }

  // === Yearly totals (4 years): newest -> oldest ===
  const yearTotals = [];
  for (let i = 0; i < 4; i++) {
    const from = now.subtract(i, "year").startOf("year").toDate();
    const to = now.subtract(i, "year").endOf("year").toDate();
    const total = await fetchDataForRange(from, to);
    yearTotals.push(total); // [current year, last year, ...]
  }

  return {
    // Daily breakdown for current week (Mon - Sun)
    "1w": weekData,

    // Weekly totals (newest to oldest)
    "2w": fourWeeks.slice(0, 2),
    "3w": fourWeeks.slice(0, 3),
    "4w": fourWeeks.slice(0, 4),

    // Monthly totals (newest to oldest)
    "1m": monthTotals.slice(0, 1),
    "2m": monthTotals.slice(0, 2),
    "3m": monthTotals.slice(0, 3),
    "4m": monthTotals.slice(0, 4),
    "5m": monthTotals.slice(0, 5),
    "6m": monthTotals.slice(0, 6),
    "7m": monthTotals.slice(0, 7),
    "8m": monthTotals.slice(0, 8),
    "9m": monthTotals.slice(0, 9),
    "10m": monthTotals.slice(0, 10),
    "11m": monthTotals.slice(0, 11),
    "12m": monthTotals.slice(0, 12),

    // Yearly totals (newest to oldest)
    "1y": yearTotals.slice(0, 1),
    "2y": yearTotals.slice(0, 2),
    "3y": yearTotals.slice(0, 3),
    "4y": yearTotals.slice(0, 4),
  };
};

const getAppointmentSummaryChartByDentist = async (tenant_id, clinic_id,dentist_id) => {
  const fetchDataForRange = async (from, to) => {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM appointment
       WHERE tenant_id = ? AND clinic_id = ? AND dentist_id=? AND created_time BETWEEN ? AND ?
       GROUP BY status`,
      [tenant_id, clinic_id, dentist_id, from, to]
    );
    const result = { CP: 0, SC: 0, CL: 0 };
    rows.forEach(row => {
      result[row.status] = row.count;
    });
    return result;
  };

  const now = dayjs();

  // === 1W: current week Mon-Sun ===
  const weekStart = now.startOf("week"); // Mon
  const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekData = { CP: [], SC: [], CL: [] };
  for (let i = 0; i < 7; i++) {
    const dayStart = weekStart.add(i, "day").startOf("day").toDate();
    const dayEnd = weekStart.add(i, "day").endOf("day").toDate();
    const counts = await fetchDataForRange(dayStart, dayEnd);
    weekData.CP.push(counts.CP || 0);
    weekData.SC.push(counts.SC || 0);
    weekData.CL.push(counts.CL || 0);
  }

  const maxWeeks = 4;
const fourWeeks = [];
const fourWeekLabels = [];

// Build labels from oldest (4w) to latest (1w)
for (let i = maxWeeks; i >= 1; i--) {
  fourWeekLabels.push(`${i}w`);
}

// Fetch counts for each week (oldest to latest)
for (let i = maxWeeks - 1; i >= 0; i--) {
  const from = now.subtract(i, "week").startOf("week").toDate();
  const to = now.subtract(i, "week").endOf("week").toDate();
  const counts = await fetchDataForRange(from, to);
  const total = (counts.CP || 0) + (counts.SC || 0) + (counts.CL || 0);
  fourWeeks.push(total);
}


  // === Months 1m to 12m: month names and total counts ===
  const maxMonths = 12;
  const monthLabels = [];
  const monthTotals = [];

  for (let i = maxMonths - 1; i >= 0; i--) {
    const from = now.subtract(i, "month").startOf("month").toDate();
    const to = now.subtract(i, "month").endOf("month").toDate();
    const counts = await fetchDataForRange(from, to);
    const total = (counts.CP || 0) + (counts.SC || 0) + (counts.CL || 0);
    monthTotals.push(total);
    monthLabels.push(dayjs(from).format("MMM")); // "Jan", "Feb", etc.
  }

  // === Years for 1y to 4y: current year + previous years ===
  const maxYears = 4;
  const yearLabels = [];
  const yearDataTotal = [];
  for (let i = maxYears - 1; i >= 0; i--) {
    const from = now.subtract(i, "year").startOf("year").toDate();
    const to = now.subtract(i, "year").endOf("year").toDate();
    yearLabels.push(dayjs(from).format("YYYY"));
    const counts = await fetchDataForRange(from, to);
    const total = (counts.CP || 0) + (counts.SC || 0) + (counts.CL || 0);
    yearDataTotal.push(total);
  }

  // === Helper for monthly total charts ===
  const buildMonthlyTotalChart = (count) => ({
    labels: monthLabels.slice(-count),
    datasets: [{ label: "Total", data: monthTotals.slice(-count) }],
  });

  // === Helper for yearly total charts ===
  const buildChartTotalOnly = (labels, dataArr, count) => ({
    labels: labels.slice(-count),
    datasets: [{ label: "Total", data: dataArr.slice(-count) }],
  });

  return {
    "1w": {
      labels: weekLabels,
      datasets: [
        { label: "Completed", data: weekData.CP },
        { label: "Scheduled", data: weekData.SC },
        { label: "Cancelled", data: weekData.CL },
      ],
    },
    "2w": {
      labels: fourWeekLabels.slice(-2),
      datasets: [{ label: "Total", data: fourWeeks.slice(-2) }],
    },
    "3w": {
      labels: fourWeekLabels.slice(-3),
      datasets: [{ label: "Total", data: fourWeeks.slice(-3) }],
    },
    "4w": {
      labels: fourWeekLabels,
      datasets: [{ label: "Total", data: fourWeeks }],
    },
    "1m": buildMonthlyTotalChart(1),
    "2m": buildMonthlyTotalChart(2),
    "3m": buildMonthlyTotalChart(3),
    "4m": buildMonthlyTotalChart(4),
    "5m": buildMonthlyTotalChart(5),
    "6m": buildMonthlyTotalChart(6),
    "7m": buildMonthlyTotalChart(7),
    "8m": buildMonthlyTotalChart(8),
    "9m": buildMonthlyTotalChart(9),
    "10m": buildMonthlyTotalChart(10),
    "11m": buildMonthlyTotalChart(11),
    "12m": buildMonthlyTotalChart(12),
    "1y": buildChartTotalOnly(yearLabels, yearDataTotal, 1),
    "2y": buildChartTotalOnly(yearLabels, yearDataTotal, 2),
    "3y": buildChartTotalOnly(yearLabels, yearDataTotal, 3),
    "4y": buildChartTotalOnly(yearLabels, yearDataTotal, 4),
  };
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
  updateAppoinmentStatusCancelled,
  getAppointmentSummary,
  getAppointmentSummaryByDentist,
  getAppointmentSummaryChartByClinic,
  getAppointmentSummaryChartByDentist,
  getAllAppointmentsByTenantIdAndClinicId,
  getAllAppointmentsByTenantIdAndClinicIdByDentist
};
