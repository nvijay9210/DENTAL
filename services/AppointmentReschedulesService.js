const { CustomError } = require("../middlewares/CustomeError");
const appointmentRescheduleModel = require("../models/AppointmentReschedulesModel");
const paymentService = require("../services/PaymentService");
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
const {
  createPayment,
  getPaymentByTenantAndAppointmentId,
} = require("./PaymentService");

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

    // 1. Fetch original appointment
    const appointment = await appointmentService.getAppointmentByTenantIdAndAppointmentId(
      details.tenant_id,
      details.original_appointment_id,
      conn
    );
    if (!appointment) {
      throw new CustomError("Original appointment not found", 404);
    }

    // 2. Cancel original appointment
    await updateAppoinmentStatusCancelledAndReschedule(
      details.original_appointment_id,
      details.tenant_id,
      details.clinic_id,
      details.rescheduled_by,
      details.reason,
      conn
    );

    // 3. Validate new date/time
    await compareDateTime(
      appointment.appointment_date,
      appointment.start_time,
      details.new_date,
      details.new_start_time
    );

    // 4. Prepare new appointment object
    const newAppointment = {
      ...appointment,
      appointment_date: details.new_date,
      start_time: details.new_start_time,
      end_time: details.new_end_time || "00:00:00",
      rescheduled_from: appointment.appointment_id,
      status: "pending",
      room_id: "00000000-0000-0000-0000-000000000000",
      dentist_id: details.dentist_id,
    };

    // 5. Validate fields
    await createAppointmentValidation(newAppointment);

    // 6. Create new appointment record
    const newAppointmentId = await appointmentService.createAppointment(newAppointment, conn);
    if (!newAppointmentId) {
      throw new CustomError("Failed to create new appointment", 500);
    }

    // 7. Handle payment
    const oldData = await getPaymentByTenantAndAppointmentId(
      details.tenant_id,
      details.original_appointment_id
    );

    const oldPayment=oldData[0]

    const minBookingFee = parseFloat(appointment.min_booking_fee || 0);
    const consultationFee = parseFloat(appointment.consultation_fee || 0);
    const extraCharge = parseFloat(details.charge_amount || 0);

    const totalAmount = extraCharge;
    const finalAmount = totalAmount - minBookingFee;

    const paymentData = oldPayment
      ? {
          tenant_id: oldPayment.tenant_id,
          clinic_id: oldPayment.clinic_id,
          dentist_id: oldPayment.dentist_id,
          patient_id: oldPayment.patient_id,
          appointment_id: newAppointmentId,
          discount_applied: parseFloat(oldPayment.discount_applied || 0),
          amount: 0,
          total_amount: totalAmount,
          final_amount: finalAmount,
          payment_for: oldPayment.payment_for,
          mode_of_payment: oldPayment.mode_of_payment,
          payment_source: oldPayment.payment_source || "offline",
          payment_reference: oldPayment.payment_reference,
          payment_verified: oldPayment.payment_verified,
          receipt_number: oldPayment.receipt_number,
          insurance_number: oldPayment.insurance_number,
          payment_date: formatDateOnly(details.new_date),
          payment_status: oldPayment.payment_status,
          created_by: details.created_by,
        }
      : {
          tenant_id: details.tenant_id,
          clinic_id: details.clinic_id,
          dentist_id: details.dentist_id,
          patient_id: appointment.patient_id,
          appointment_id: newAppointmentId,
          discount_applied: 0,
          amount: minBookingFee,
          total_amount: totalAmount,
          final_amount: finalAmount,
          payment_for: "booking",
          mode_of_payment: details.mode_of_payment || "Cash",
          payment_source: "offline",
          payment_verified: false,
          receipt_number: null,
          insurance_number: null,
          payment_date: formatDateOnly(details.new_date),
          payment_status: "unpaid",
          created_by: details.created_by,
        };

    await paymentService.createPayment(paymentData, conn);

    // 8. Create reschedule record
    details.new_appointment_id = newAppointmentId;
    const { columns, values } = mapFields(details, fieldMap);
    await appointmentRescheduleModel.createAppointmentReschedules(
      "appointment_reschedules",
      columns,
      values,
      conn
    );

    // 9. Update stats
    await updateAppointmentStats(
      newAppointment.tenant_id,
      newAppointment.clinic_id,
      newAppointment.dentist_id,
      newAppointment.appointment_date,
      conn
    );

    // 10. Commit
    await conn.commit();

    // 11. Invalidate cache
    await invalidateCacheByPattern("appointmentreschedule:*");

    return newAppointmentId;
  } catch (error) {
    await conn.rollback();
    console.error("[Reschedule] ❌ Transaction failed:", error);
    throw new CustomError(
      `Failed to reschedule appointment: ${error.message}`,
      error.statusCode || 500
    );
  } finally {
    if (conn) await conn.release();
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
