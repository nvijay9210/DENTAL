const { CustomError } = require("../middlewares/CustomeError");
const appointmentModel = require("../models/AppointmentModel");
const {
  redisClient,
  invalidateCacheByTenant,
  getOrSetCache,
} = require("../config/redisConfig");
const { decodeJsonFields, getJsonValue } = require("../utils/Helpers");
const { formatDateOnly, formatTimeOnly, formatAppointments } = require("../utils/DateUtils");
const { mapFields } = require("../query/Records");

// Create Appointment
const createAppointment = async (data) => {
  const fieldMap = {
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
    discount_applied: (val) => val || 0.00,
    payment_status: (val) => val || "P",
    payment_method: (val) => val || null,
    visit_reason: (val) => val || null,
    follow_up_needed: (val) => Boolean(val),
    reminder_method: (val) => val || null,
    notes: (val) => val || null,
    created_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, fieldMap);
    const appointmentId = await appointmentModel.createAppointment("appointment", columns, values);
    await invalidateCacheByTenant("appointment", data.tenant_id);
    return appointmentId;
  } catch (error) {
    console.error("Failed to create appointment:", error);
    throw new CustomError(`Failed to create appointment: ${error.message}`, 500);
  }
};

// Get All Appointments by Tenant ID with Caching
const getAllAppointmentsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `appointment:${tenantId}:page:${page}:limit:${limit}`;
  const fieldsToDecode = ["notes", "visit_reason"];

  try {
    const appointment = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentModel.getAllAppointmentsByTenantId(tenantId, Number(limit), offset);
      return decodeJsonFields(result, fieldsToDecode);
    });
    return appointment;
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 500);
  }
};

// Get Appointment by Tenant & ID
const getAppointmentByTenantIdAndAppointmentId = async (tenantId, appointmentId) => {
  try {
    const appointment = await appointmentModel.getAppointmentByTenantIdAndAppointmentId(
      tenantId,
      appointmentId
    );
    const fieldsToDecode = ["notes", "visit_reason"];
    return decodeJsonFields(appointment, fieldsToDecode);
  } catch (error) {
    throw new CustomError("Failed to get appointment: " + error.message, 500);
  }
};

// Check if Appointment Exists
const checkAppointmentExistsByTenantIdAndAppointmentId = async (tenantId, appointmentId) => {
  try {
    return await appointmentModel.checkAppointmentExistsByTenantIdAndAppointmentId(tenantId, appointmentId);
  } catch (error) {
    throw new CustomError("Failed to check appointment existence: " + error.message, 500);
  }
};

// Update Appointment
const updateAppointment = async (appointmentId, data, tenant_id) => {
  const fieldMap = {
    tenant_id: (val) => val,
    patient_id: (val) => val,
    dentist_id: (val) => val,
    hospital_id: (val) => val,
    clinic_id: (val) => val,
    appointment_date: (val) => formatDateOnly(val),
    start_time: (val) => formatTimeOnly(val),
    end_time: (val) => formatTimeOnly(val),
    status: (val) => val,
    appointment_type: (val) => val,
    consultation_fee: (val) => val || null,
    discount_applied: (val) => val || 0.00,
    payment_status: (val) => val || null,
    payment_method: (val) => val || null,
    visit_reason: (val) => val || null,
    follow_up_needed: (val) => Boolean(val),
    reminder_method: (val) => val || null,
    notes: (val) => val || null,
    updated_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await appointmentModel.updateAppointment(appointmentId, columns, values, tenant_id);

    if (affectedRows === 0) {
      throw new CustomError("Appointment not found or no changes made.", 404);
    }

    await invalidateCacheByTenant("appointment", tenant_id);
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update appointment", 500);
  }
};

// Delete Appointment
const deleteAppointmentByTenantIdAndAppointmentId = async (tenantId, appointmentId) => {
  try {
    const affectedRows = await appointmentModel.deleteAppointmentByTenantIdAndAppointmentId(tenantId, appointmentId);
    if (affectedRows === 0) {
      throw new CustomError("Appointment not found.", 404);
    }

    await invalidateCacheByTenant("appointment", tenantId);
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete appointment: ${error.message}`, 500);
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
    throw new CustomError("Failed to check overlapping appointment", 500);
  }
};

const getAppointmentsWithDetails = async (tenantId, clinic_id, dentist_id, page = 1, limit = 10) => {
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

      const formatted = formatAppointments(result); // ✅ Use the returned value
      return decodeJsonFields(formatted, fieldsToDecode); // ✅ Pass formatted data
    });

    return appointment;
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 500);
  }
};
const getAppointmentMonthlySummary = async (tenantId, clinic_id, dentist_id) => {
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
    throw new CustomError("Failed to fetch appointment", 500);
  }
};

const getPatientVisitDetailsByPatientIdAndTenantIdAndClinicId = async (tenantId,clinicId, patientId,page,limit) => {
  try {
    const offset = (page - 1) * limit;
    const cacheKey = `patientvisitdetails:${tenantId}/${clinicId}/${patientId}`;
    const appointment = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentModel.getPatientVisitDetailsByPatientIdAndTenantIdAndClinicId(
        tenantId,clinicId, patientId,limit,offset
      );
      return result; // 🔁 Important: return from cache function
    });

    return appointment;
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 500);
  }
};



module.exports = {
  createAppointment,
  getAllAppointmentsByTenantId,
  getAppointmentByTenantIdAndAppointmentId,
  checkAppointmentExistsByTenantIdAndAppointmentId,
  updateAppointment,
  deleteAppointmentByTenantIdAndAppointmentId,
  checkAppointmentExistsByStartTimeAndEndTimeAndDate,
  getAppointmentsWithDetails,
  getAppointmentMonthlySummary,
  getPatientVisitDetailsByPatientIdAndTenantIdAndClinicId
};