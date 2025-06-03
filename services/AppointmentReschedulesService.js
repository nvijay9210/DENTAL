const { CustomError } = require("../middlewares/CustomeError");
const appointmentRescheduleModel = require("../models/AppointmentReschedulesModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const { formatDateOnly } = require("../utils/DateUtils");
const { duration } = require("moment");

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
  new_time: (val) => val,
  rescheduled_by: (val) => val,
  rescheduled_at: (val) => val,
  charge_applicable: helper.parseBoolean,
  charge_amount: (val) => parseFloat(val)||0.00,
};

const appointmentRescheduleFieldsReverseMap = {
  reschedule_id:(val)=>val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  dentist_id: (val) => val,
  original_appointment_id: (val) => val,
  new_appointment_id: (val) => val,
  reason: helper.safeJsonParse,
  previous_date: (val) => formatDateOnly(val),
  new_date: (val) => (val ? formatDateOnly(val) : null),
  previous_time: (val) => duration(val),
  new_time: (val) => duration(val),
  rescheduled_by: (val) => val,
  rescheduled_at: (val) => val,
  charge_applicable:(val)=> Boolean(val),
  charge_amount: (val) => parseFloat(val)||0.00,
  created_by: (val) => val,
  created_time: (val) => (val ? new Date(val).toISOString() : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? new Date(val).toISOString() : null),
};

// Create AppointmentReschedules
const createAppointmentReschedules = async (data) => {
  const fieldMap = {
    ...appointmentRescheduleFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const appointmentRescheduleId = await appointmentRescheduleModel.createAppointmentReschedules(
      "appointmentReschedule",
      columns,
      values
    );
    await invalidateCacheByPattern("appointmentReschedule:*");
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
  const cacheKey = `appointmentReschedule:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const appointmentReschedules = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentRescheduleModel.getAllAppointmentReschedulessByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = appointmentReschedules.map((appointmentReschedule) =>
      helper.convertDbToFrontend(appointmentReschedule, appointmentRescheduleFieldsReverseMap)
    );

    return convertedRows;
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
  const cacheKey = `appointmentReschedule:${tenantId}:clinic:${clinic_id}:page:${page}:limit:${limit}`;

  try {
    const appointmentReschedules = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentRescheduleModel.getAllAppointmentReschedulessByTenantIdAndClinicId(
        tenantId,
        clinic_id,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = appointmentReschedules.map((appointmentReschedule) =>
      helper.convertDbToFrontend(appointmentReschedule, appointmentRescheduleFieldsReverseMap)
    );

    return convertedRows;
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
  const cacheKey = `appointmentReschedule:${tenantId}:dentist:${dentist_id}:page:${page}:limit:${limit}`;

  try {
    const appointmentReschedules = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentRescheduleModel.getAllAppointmentReschedulessByTenantIdAndClinicIdAndDentistId(
        tenantId,
        clinic_id,
        dentist_id,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = appointmentReschedules.map((appointmentReschedule) =>
      helper.convertDbToFrontend(appointmentReschedule, appointmentRescheduleFieldsReverseMap)
    );

    return convertedRows;
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

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get appointmentReschedule: " + error.message, 404);
  }
};

// Update AppointmentReschedules
const updateAppointmentReschedules = async (appointmentRescheduleId, data, tenant_id) => {
  const fieldMap = {
    ...appointmentRescheduleFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await appointmentRescheduleModel.updateAppointmentReschedules(
      appointmentRescheduleId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("AppointmentReschedules not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("appointmentReschedule:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update appointmentReschedule", 404);
  }
};

// Delete AppointmentReschedules
const deleteAppointmentReschedulesByTenantIdAndAppointmentReschedulesId = async (
  tenantId,
  appointmentRescheduleId
) => {
  try {
    const affectedRows =
      await appointmentRescheduleModel.deleteAppointmentReschedulesByTenantAndAppointmentReschedulesId(
        tenantId,
        appointmentRescheduleId
      );
    if (affectedRows === 0) {
      throw new CustomError("AppointmentReschedules not found.", 404);
    }

    await invalidateCacheByPattern("appointmentReschedule:*");
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
  getAllAppointmentReschedulessByTenantIdAndClinicId
};
