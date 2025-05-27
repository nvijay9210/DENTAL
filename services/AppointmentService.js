const { CustomError } = require("../middlewares/CustomeError");
const appointmentModel = require("../models/AppointmentModel");
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
  payment_status: (val) => val || "P",
  payment_method: (val) => val || null,
  visit_reason: (val) => val || null,
  follow_up_needed: (val) => Boolean(val),
  reminder_method: (val) => val || null,
  notes: (val) => val || null,
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
  payment_method: (val) => val,
  visit_reason: (val) => (val ? safeJsonParse(val) : null),
  follow_up_needed: (val) => Boolean(val),
  reminder_method: (val) => val,
  notes: (val) => (val ? safeJsonParse(val) : null),
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
const getAppointmentSummary = async (
  tenantId,
  clinic_id,
  dentist_id,
  period
) => {
  try {
    const cacheKey = `getAppointmentSummary:${tenantId}/${clinic_id}/${dentist_id}`;
    const appointment = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentModel.getAppointmentSummary(
        tenantId,
        clinic_id,
        dentist_id,
        period
      );
      return result; // 🔁 Important: return from cache function
    });

    return appointment;
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

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
  getAppointmentSummary
};
