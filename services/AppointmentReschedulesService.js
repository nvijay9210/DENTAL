const { CustomError } = require("../middlewares/CustomeError");
const appointmentRescheduleModel = require("../models/AppointmentReschedulesModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const {
  formatDateOnly,
  compareDateTime,
  convertUTCToLocal,
} = require("../utils/DateUtils");
const { duration } = require("../utils/Helpers");
const { checkIfExists } = require("../models/checkIfExists");

const {
  updateAppoinmentStatusCancelledAndReschedule,
  updateAppointmentStats,
} = require("../models/AppointmentModel");
const appointmentService = require("../services/AppointmentService");
const {
  createAppointmentValidation,
} = require("../validations/AppointmentValidation");
const { buildCacheKey } = require("../utils/RedisCache");

// Field mapping for appointmentReschedules (similar to treatment)

const appointmentRescheduleFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  dentist_id: (val) => val,
  original_appointment_id: (val) => val,
  new_appointment_id: (val) => val,
  reason: helper.safeStringify,
  previous_date: (val) => (val ? formatDateOnly(val) : null),
  new_date: (val) => (val ? formatDateOnly(val) : null),
  previous_time: (val) => val,
  new_start_time: (val) => val,
  new_end_time: (val) => val,
  rescheduled_by: (val) => val,
  rescheduled_at: (val) => val,
  charge_applicable: helper.parseBoolean,
  charge_amount: (val) => (val ? parseFloat(val) : 0),
};

const appointmentRescheduleFieldsReverseMap = {
  rescheduled_id: (val) => val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  dentist_id: (val) => val,
  original_appointment_id: (val) => val,
  new_appointment_id: (val) => val,
  reason: helper.safeJsonParse,
  previous_date: (val) => formatDateOnly(val),
  new_date: (val) => (val ? formatDateOnly(val) : null),
  previous_time: (val) => val,
  new_start_time: (val) => val,
  new_end_time: (val) => val,
  rescheduled_by: (val) => val,
  rescheduled_at: (val) => val,
  charge_applicable: (val) => Boolean(val),
  charge_amount: (val) => (val ? parseFloat(val) : 0),
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};

// Create AppointmentReschedules
const createAppointmentReschedules = async (details) => {
  const fieldMap = {
    ...appointmentRescheduleFields,
    created_by: (val) => val,
  };
  try {
    const appointment =
      await appointmentService.getAppointmentByTenantIdAndAppointmentId(
        details.tenant_id,
        details.original_appointment_id
      );

    await updateAppoinmentStatusCancelledAndReschedule(
      details.original_appointment_id,
      details.tenant_id,
      details.clinic_id,
      details.rescheduled_by,
      details.reason
    );

    await compareDateTime(
      appointment.appointment_date,
      appointment.start_time,
      details.new_date,
      details.new_start_time
    );

    details.previous_date = appointment.appointment_date;
    details.previous_time = appointment.start_time;

    (appointment.appointment_date = details.new_date),
      (appointment.start_time = details.new_start_time),
      (appointment.end_time = details.new_end_time || "00:00:00"), //If new add
      (appointment.rescheduled_from = appointment.appointment_id);
    appointment.status = "pending";
    appointment.room_id = "00000000-0000-0000-0000-000000000000";

    await createAppointmentValidation(appointment);

    const newAppointment = await appointmentService.createAppointment(
      appointment
    );

    details.new_appointment_id = newAppointment;

    const { columns, values } = mapFields(details, fieldMap);

    const appointmentRescheduleId =
      await appointmentRescheduleModel.createAppointmentReschedules(
        "appointment_reschedules",
        columns,
        values
      );
    await updateAppointmentStats(
      appointment.tenant_id,
      appointment.clinic_id,
      appointment.appointment_date
    );
    await invalidateCacheByPattern("appointmentreschedule:*");
    return appointmentRescheduleId;
  } catch (error) {
    console.error("Failed to create appointmentReschedule:", error);
    throw new CustomError(
      `Failed to create appointmentReschedule: ${error.message}`,
      404
    );
  }
};

// Get All AppointmentRescheduless by Tenant ID with Caching
const getAllAppointmentReschedulessByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("appointmentreschedule", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });
  try {
    const appointmentReschedules = await getOrSetCache(cacheKey, async () => {
      const result =
        await appointmentRescheduleModel.getAllAppointmentReschedulessByTenantId(
          tenantId,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = appointmentReschedules.data.map(
      (appointmentReschedules) =>
        helper.convertDbToFrontend(
          appointmentReschedules,
          appointmentRescheduleFieldsReverseMap
        )
    );

    return { data: convertedRows, total: appointmentReschedules.total };
  } catch (err) {
    console.error("Database error while fetching appointmentReschedules:", err);
    throw new CustomError("Failed to fetch appointmentReschedules", 404);
  }
};
const getAllAppointmentReschedulessByTenantIdAndClinicId = async (
  tenantId,
  clinic_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("appointmentreschedule", "list", {
    tenant_id: tenantId,
    clinic_id,
    page,
    limit,
  });

  try {
    const appointmentReschedules = await getOrSetCache(cacheKey, async () => {
      const result =
        await appointmentRescheduleModel.getAllAppointmentReschedulessByTenantIdAndClinicId(
          tenantId,
          clinic_id,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = appointmentReschedules.data.map(
      (appointmentReschedule) =>
        helper.convertDbToFrontend(
          appointmentReschedule,
          appointmentRescheduleFieldsReverseMap
        )
    );

    return { data: convertedRows, total: appointmentReschedules.total };
  } catch (err) {
    console.error("Database error while fetching appointmentReschedules:", err);
    throw new CustomError("Failed to fetch appointmentReschedules", 404);
  }
};

const getAllAppointmentReschedulessByTenantIdAndClinicIdAndDentistId = async (
  tenantId,
  clinic_id,
  dentist_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("appointmentreschedule", "list", {
    tenant_id: tenantId,
    clinic_id,
    dentist_id,
    page,
    limit,
  });
  try {
    const appointmentReschedules = await getOrSetCache(cacheKey, async () => {
      const result =
        await appointmentRescheduleModel.getAllAppointmentReschedulessByTenantIdAndClinicIdAndDentistId(
          tenantId,
          clinic_id,
          dentist_id,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = appointmentReschedules.data.map(
      (appointmentReschedule) =>
        helper.convertDbToFrontend(
          appointmentReschedule,
          appointmentRescheduleFieldsReverseMap
        )
    );

    return { data: convertedRows, total: appointmentReschedules.total };
  } catch (err) {
    console.error("Database error while fetching appointmentReschedules:", err);
    throw new CustomError("Failed to fetch appointmentReschedules", 404);
  }
};

// Get AppointmentReschedules by ID & Tenant
const getAppointmentReschedulesByTenantIdAndAppointmentReschedulesId = async (
  tenantId,
  appointmentRescheduleId
) => {
  try {
    const appointmentReschedule =
      await appointmentRescheduleModel.getAppointmentReschedulesByTenantAndAppointmentReschedulesId(
        tenantId,
        appointmentRescheduleId
      );
    const convertedRows = helper.convertDbToFrontend(
      appointmentReschedule,
      appointmentRescheduleFieldsReverseMap
    );

    return { data: convertedRows, total: appointmentReschedules.total };
  } catch (error) {
    throw new CustomError(
      "Failed to get appointmentReschedule: " + error.message,
      404
    );
  }
};

// Update AppointmentReschedules
const updateAppointmentReschedules = async (
  appointmentRescheduleId,
  data,
  tenant_id
) => {
  const fieldMap = {
    ...appointmentRescheduleFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows =
      await appointmentRescheduleModel.updateAppointmentReschedules(
        appointmentRescheduleId,
        columns,
        values,
        tenant_id
      );

    if (affectedRows === 0) {
      throw new CustomError(
        "AppointmentReschedules not found or no changes made.",
        404
      );
    }

    await invalidateCacheByPattern("appointmentreschedule:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update appointmentReschedule", 404);
  }
};

// Delete AppointmentReschedules
const deleteAppointmentReschedulesByTenantIdAndAppointmentReschedulesId =
  async (tenantId, appointmentRescheduleId) => {
    try {
      const affectedRows =
        await appointmentRescheduleModel.deleteAppointmentReschedulesByTenantAndAppointmentReschedulesId(
          tenantId,
          appointmentRescheduleId
        );
      if (affectedRows === 0) {
        throw new CustomError("AppointmentReschedules not found.", 404);
      }

      await invalidateCacheByPattern("appointmentreschedule:*");
      return affectedRows;
    } catch (error) {
      throw new CustomError(
        `Failed to delete appointmentReschedule: ${error.message}`,
        404
      );
    }
  };

module.exports = {
  createAppointmentReschedules,
  getAllAppointmentReschedulessByTenantId,
  getAppointmentReschedulesByTenantIdAndAppointmentReschedulesId,
  updateAppointmentReschedules,
  deleteAppointmentReschedulesByTenantIdAndAppointmentReschedulesId,
  getAllAppointmentReschedulessByTenantIdAndClinicIdAndDentistId,
  getAllAppointmentReschedulessByTenantIdAndClinicId,
};
