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

    //console.log("[Reschedule] Transaction started");

    // 1. Get original appointment
    const appointment = await appointmentService.getAppointmentByTenantIdAndAppointmentId(
      details.tenant_id,
      details.original_appointment_id,
      conn
    );

    if (!appointment) {
      throw new CustomError("Original appointment not found", 404);
    }

    //console.log(`[Reschedule] Fetched original appointment: ID=${appointment.appointment_id}, Status=${appointment.status}`);

    // 2. Cancel original appointment
    await updateAppoinmentStatusCancelledAndReschedule(
      details.original_appointment_id,
      details.tenant_id,
      details.clinic_id,
      details.rescheduled_by,
      details.reason,
      conn
    );

    //console.log(`[Reschedule] Original appointment cancelled: ID=${details.original_appointment_id}`);

    // 3. Validate new date/time
    await compareDateTime(
      appointment.appointment_date,
      appointment.start_time,
      details.new_date,
      details.new_start_time
    );

    //console.log("[Reschedule] New date/time validation passed");

    // 4. Prepare new appointment data
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

    //console.log(`[Reschedule] Prepared new appointment: Date=${newAppointment.appointment_date}, Time=${newAppointment.start_time}`);

    // 5. Validate appointment fields
    await createAppointmentValidation(newAppointment);
    //console.log("[Reschedule] New appointment validation passed");

    // 6. Fetch original payment If not details gets choose this
    const payment = await getPaymentByTenantAndAppointmentId(
      details.tenant_id,
      details.original_appointment_id
    );

    if (!payment) {
      console.warn(`[Reschedule] No payment found for appointment ID=${details.original_appointment_id}. Proceeding without payment copy.`);
    } else {
      //console.log(`[Reschedule] Fetched original payment: ID=${payment.payment_id}, Status=${payment.payment_status}`);
    }

    // 7. Calculate total amount
    const minBookingFee = parseFloat(appointment.min_booking_fee || 0);
    const consultationFee = parseFloat(appointment.consultation_fee || 0);
    const chargeAmount = parseFloat(details.charge_amount || 0);

    const totalAmount = minBookingFee + consultationFee + chargeAmount;

    //console.log(`[Reschedule] Calculated total amount: ₹${totalAmount} (Booking: ₹${minBookingFee}, Consultation: ₹${consultationFee}, Charge: ₹${chargeAmount})`);

    // 8. Prepare payment data for new appointment
    const paymentData = payment
      ? {
          tenant_id: payment.tenant_id,
          clinic_id: payment.clinic_id,
          dentist_id: payment.dentist_id,
          patient_id: payment.patient_id,
          discount_applied: parseFloat(payment.discount_applied || 0),
          total_amount: totalAmount,
          final_amount: totalAmount,
          amount: totalAmount,
          payment_for: payment.payment_for,
          mode_of_payment: payment.mode_of_payment,
          payment_source: payment.payment_source || "offline",
          payment_reference: payment.payment_reference,
          payment_verified: payment.payment_verified,
          receipt_number: payment.receipt_number,
          insurance_number: payment.insurance_number,
          payment_date: formatDateOnly(new Date()),
          payment_status: payment.payment_status,
          created_by: payment.created_by,
        }
      : {
          total_amount: totalAmount,
          final_amount: totalAmount,
          amount: totalAmount,
          payment_for: "booking",
          payment_status: "paid",
          payment_source: "offline",
          created_by: details.created_by,
        };

    //console.log(`[Reschedule] Payment data prepared: Status=${paymentData.payment_status}, Total=₹${paymentData.total_amount}`);

    // 9. Merge payment into new appointment
    const finalAppointment = { ...newAppointment, ...paymentData };

    // 10. Create new appointment
    const newAppointmentId = await appointmentService.createAppointment(
      finalAppointment,
      conn
    );

    //console.log(`[Reschedule] New appointment created: ID=${newAppointmentId}`);

    // 11. Create reschedule record
    details.new_appointment_id = newAppointmentId;
    const { columns, values } = mapFields(details, fieldMap);

    const rescheduleRecordId =
      await appointmentRescheduleModel.createAppointmentReschedules(
        "appointment_reschedules",
        columns,
        values,
        conn
      );

    //console.log(`[Reschedule] Reschedule record created: ID=${rescheduleRecordId}`);

    // 12. Update stats
    await updateAppointmentStats(
      finalAppointment.tenant_id,
      finalAppointment.clinic_id,
      finalAppointment.dentist_id,
      finalAppointment.appointment_date,
      conn
    );

    //console.log("[Reschedule] Appointment stats updated");

    // 13. Commit transaction
    await conn.commit();
    //console.log(`[Reschedule] ✅ Transaction committed successfully. New Appointment ID: ${newAppointmentId}, Reschedule Record ID: ${rescheduleRecordId}`);

    // 14. Invalidate cache (non-transactional)
    await invalidateCacheByPattern("appointmentreschedule:*");
    //console.log("[Reschedule] Cache invalidated for pattern: appointmentreschedule:*");

    return rescheduleRecordId;
  } catch (error) {
    await conn.rollback();
    console.error("[Reschedule] ❌ Transaction rolled back due to error:", {
      message: error.message,
      stack: error.stack,
      details: {
        tenant_id: details.tenant_id,
        original_appointment_id: details.original_appointment_id,
        new_date: details.new_date,
      },
    });

    throw new CustomError(
      `Failed to reschedule appointment: ${error.message}`,
      error.statusCode || 500
    );
  } finally {
    if (conn) await conn.release();
    //console.log("[Reschedule] Database connection released");
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
