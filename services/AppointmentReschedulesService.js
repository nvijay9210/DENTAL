const { CustomError } = require("../middlewares/CustomeError");
const appointmentRescheduleModel = require("../models/AppointmentReschedulesModel");
const pool = require("../config/db");
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
const { createPayment } = require("./PaymentService");

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

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get the original appointment using the transaction connection
    let appointment = await appointmentService.getAppointmentByTenantIdAndAppointmentId(
      details.tenant_id,
      details.original_appointment_id,
      conn // pass connection
    );

    // 2. Cancel original appointment and mark for reschedule
    await updateAppoinmentStatusCancelledAndReschedule(
      details.original_appointment_id,
      details.tenant_id,
      details.clinic_id,
      details.rescheduled_by,
      details.reason,
      conn // pass connection
    );

    // 3. Validate new date/time
    await compareDateTime(
      appointment.appointment_date,
      appointment.start_time,
      details.new_date,
      details.new_start_time
    );

    // 4. Prepare new appointment data
    details.previous_date = appointment.appointment_date;
    details.previous_time = appointment.start_time;

    appointment = {
      ...appointment,
      appointment_date: details.new_date,
      start_time: details.new_start_time,
      end_time: details.new_end_time || "00:00:00",
      rescheduled_from: appointment.appointment_id,
      status: "pending",
      room_id: "00000000-0000-0000-0000-000000000000",
      dentist_id: details.dentist_id,
    };

    // 5. Validate appointment fields
    await createAppointmentValidation(appointment);

    // 6. Prepare payment data for new appointment
    const paymentData = {
      tenant_id: appointment?.tenant_id,
      clinic_id: appointment?.clinic_id,
      dentist_id: appointment?.dentist_id,
      patient_id: appointment?.patient_id,
      appointment_id: appointment?.appointment_id,
      discount_applied: parseFloat(appointment?.discount_applied || 0),
      total_amount: parseFloat(
        (appointment?.min_booking_fee || 0) +
        (appointment?.consultation_fee || 0) +
        (details.charge_amount || 0)
      ),
      final_amount: parseFloat(
        (appointment?.min_booking_fee || 0) +
        (appointment?.consultation_fee || 0) +
        (details.charge_amount || 0)
      ),
      payment_for: appointment?.payment_for,
      mode_of_payment: appointment?.mode_of_payment,
      payment_source: appointment?.payment_source || "offline",
      payment_reference: appointment?.payment_reference,
      payment_verified: appointment?.payment_verified,
      receipt_number: appointment?.receipt_number,
      insurance_number: appointment?.insurance_number,
      payment_date: formatDateOnly(appointment?.appointment_date),
      payment_status: appointment?.payment_status,
      created_by: appointment?.created_by,
    };

    appointment = { ...appointment, ...paymentData };

    // 7. Create new appointment (using the same connection)
    const newAppointmentId = await appointmentService.createAppointment(
      appointment,
      conn // pass connection
    );
    details.new_appointment_id = newAppointmentId;

    // 8. Create appointment reschedule record
    const { columns, values } = mapFields(details, fieldMap);
    const appointmentRescheduleId =
      await appointmentRescheduleModel.createAppointmentReschedules(
        "appointment_reschedules",
        columns,
        values,
        conn // pass connection
      );

    // 9. Update appointment stats
    await updateAppointmentStats(
      appointment.tenant_id,
      appointment.clinic_id,
      appointment.dentist_id,
      appointment.appointment_date,
      conn // pass connection
    );


    // 11. Commit transaction
    await conn.commit();

    // 12. Invalidate cache (non-transactional, outside rollback scope)
    await invalidateCacheByPattern("appointmentreschedule:*");

    return appointmentRescheduleId;
  } catch (error) {
    await conn.rollback();
    console.error("Failed to create appointmentReschedule:", error);
    throw new CustomError(
      `Failed to create appointmentReschedule: ${error.message}`,
      404
    );
  } finally {
    await conn.release();
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
  } catch (error) {
    console.error(
      "Database error while fetching appointmentReschedules:",
      error
    );
    throw new CustomError(error, 500);
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
  } catch (error) {
    console.error(
      "Database error while fetching appointmentReschedules:",
      error
    );
    throw new CustomError(error, 500);
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
  } catch (error) {
    console.error(
      "Database error while fetching appointmentReschedules:",
      error
    );
    throw new CustomError(error, 500);
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

    // if (affectedRows === 0) {
    //   throw new CustomError(
    //     "AppointmentReschedules not found or no changes made.",
    //     404
    //   );
    // }

    await invalidateCacheByPattern("appointmentreschedule:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError(error, 500);
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
      // if (affectedRows === 0) {
      //   throw new CustomError("AppointmentReschedules not found.", 404);
      // }

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
