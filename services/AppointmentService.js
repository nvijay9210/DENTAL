const { CustomError } = require("../middlewares/CustomeError");
const appointmentModel = require("../models/AppointmentModel");
const paymentService = require("../services/PaymentService");
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
const {
  formatDateOnly,
  formatAppointments,
  isoToSqlDatetime,
  convertUTCToLocal,
} = require("../utils/DateUtils");
const { mapFields } = require("../query/Records");
const { updatePatientCount } = require("../models/ClinicModel");
const { updatePatientAppointmentCount } = require("../models/PatientModel");
const {
  updateDentistAppointmentCount,
  getDentistByTenantIdAndDentistId,
  updateDentistRatingAndReviewCount,
} = require("../models/DentistModel");

const appointmentFields = {
  tenant_id: (val) => val,
  patient_id: (val) => val,
  dentist_id: (val) => val,
  clinic_id: (val) => val,
  room_id: (val) => val || "00000000-0000-0000-0000-000000000000",
  appointment_date: (val) => formatDateOnly(val),
  start_time: (val) => val,
  end_time: (val) => val,
  status: (val) => val,
  appointment_final_status: (val) => val||'pending',
  doctor_rating: (val) => (val ? parseFloat(val) : 0),
  feedback: (val) => helper.safeStringify(val),
  appointment_type: (val) => val,
  consultation_fee: (val) => val || null,
  discount_applied: (val) => val || 0.0,
  payment_status: (val) => val,
  min_booking_fee: (val) => (val ? parseFloat(val) : 0),
  paid_amount: (val) => (val ? parseFloat(val) : 0),
  mode_of_payment: (val) => val,
  visit_reason: helper.safeStringify,
  follow_up_needed: (val) => Boolean(val),
  reminder_method: (val) => val || null,
  notes: helper.safeStringify,
  rescheduled_from: (val) => val || null,
  cancelled_by: (val) => val || null,
  cancellation_reason: helper.safeStringify,
  is_virtual: helper.parseBoolean,
  reminder_send: helper.parseBoolean,
  meeting_link: (val) => val || null,
  checkin_time: (val) => (val ? isoToSqlDatetime(val) : null),
  checkout_time: (val) => (val ? isoToSqlDatetime(val) : null),
};

const appointmentFieldsReverseMap = {
  appointment_id: (val) => val,
  room_id: (val) => val,
  tenant_id: (val) => val,
  patient_id: (val) => val,
  dentist_id: (val) => val,
  clinic_id: (val) => val,
  appointment_date: (val) => formatDateOnly(val),
  start_time: (val) => val,
  end_time: (val) => val,
  status: (val) => val,
  appointment_final_status: (val) => val,
  doctor_rating: (val) => val,
  feedback: (val) => safeJsonParse(val),
  appointment_type: (val) => val,
  consultation_fee: (val) => val,
  discount_applied: (val) => val || 0.0,
  payment_status: (val) => val,
  min_booking_fee: (val) => parseInt(val),
  paid_amount: (val) => parseInt(val),
  mode_of_payment: (val) => val,
  visit_reason: (val) => (val ? safeJsonParse(val) : null),
  follow_up_needed: (val) => Boolean(val),
  reminder_method: (val) => val,
  notes: (val) => (val ? safeJsonParse(val) : null),
  rescheduled_from: (val) => val || null,
  cancelled_by: (val) => val || null,
  cancellation_reason: helper.safeJsonParse,
  is_virtual: (val) => Boolean(val),
  reminder_send: (val) => Boolean(val),
  meeting_link: (val) => val || null,
  checkin_time: (val) => (val ? convertUTCToLocal(val) : null),
  checkout_time: (val) => (val ? convertUTCToLocal(val) : null),
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};

// Create Appointment'

const createAppointment = async (data, connection = null) => {
  // console.log("[Appointment] Creating new appointment:", {
  //   tenant_id: data.tenant_id,
  //   clinic_id: data.clinic_id,
  //   patient_id: data.patient_id,
  //   appointment_date: data.appointment_date,
  //   start_time: data.start_time,
  // });

  const fieldMap = {
    ...appointmentFields,
    created_by: (val) => val,
  };

  const conn = connection || (await pool.getConnection());
  let committed = false;

  try {
    await conn.beginTransaction();

    // 1. Create appointment
    const { columns, values } = mapFields(data, fieldMap);
    const appointmentId = await appointmentModel.createAppointment(
      "appointment",
      columns,
      values,
      conn
    );

    if (!appointmentId) {
      throw new CustomError("Failed to create appointment record", 500);
    }

    //console.log(`[Appointment] Created with ID=${appointmentId}`);

    // 2. Prepare and create payment (inside transaction)
    const minBookingFee = parseFloat(data?.min_booking_fee) || 0;
    const consultationFee = parseFloat(data?.consultation_fee) || 0;
    const discountApplied = parseFloat(data?.discount_applied) || 0;

    const totalAmount =  consultationFee;
    const finalAmount = totalAmount - minBookingFee;

    const paymentData = {
      tenant_id: data.tenant_id,
      clinic_id: data.clinic_id,
      dentist_id: data.dentist_id,
      patient_id: data.patient_id,
      appointment_id: appointmentId,
      discount_applied: discountApplied,
      amount: minBookingFee,
      final_amount: finalAmount,
      total_amount: totalAmount,
      payment_for: data.payment_for || "booking",
      mode_of_payment: data.mode_of_payment || "Cash",
      payment_source: data.payment_source || "offline",
      payment_reference: data.payment_reference || {},
      payment_verified: data.payment_verified || false,
      receipt_number: data.receipt_number || null,
      insurance_number: data.insurance_number || null,
      payment_date: formatDateOnly(data.appointment_date),
      payment_status: data.payment_status || "unpaid",
      created_by: data.created_by,
    };

    await paymentService.createPayment(paymentData, conn);
    // console.log(
    //   `[Appointment] Payment created for appointment ID=${appointmentId}`
    // );

    // 3. Commit transaction
    await conn.commit();
    committed = true;
    // console.log(
    //   `[Appointment] ✅ Transaction committed. Appointment ID: ${appointmentId}`
    // );

    // =====================================================
    // 🔽 Non-critical updates moved OUTSIDE transaction
    // =====================================================

    try {
      // These can fail without affecting core flow
      await updatePatientCount(data.tenant_id, data.clinic_id, true);
      await updatePatientAppointmentCount(
        data.tenant_id,
        data.patient_id,
        true
      );
      await updateDentistAppointmentCount(
        data.tenant_id,
        data.clinic_id,
        data.dentist_id,
        true
      );
      await appointmentModel.updateAppointmentStats(
        data.tenant_id,
        data.clinic_id,
        data.dentist_id,
        data.appointment_date,
        conn
      );
      // console.log("[Appointment] Stats updated successfully");
    } catch (statsErr) {
      console.warn(
        "[Appointment] Background stat update failed (non-critical):",
        statsErr.message
      );
      // Continue — don't throw
    }

    // 4. Invalidate cache (non-blocking, best effort)
    try {
      await Promise.all([
        invalidateCacheByPattern("appointment:*"),
        invalidateCacheByPattern("appointmentsdetails:*"),
        invalidateCacheByPattern("patientvisitdetails:*"),
        invalidateCacheByPattern("appointmentsummary:*"),
        invalidateCacheByPattern("financeSummary:*"),
        invalidateCacheByPattern("patient:*"),
      ]);
      //console.log("[Appointment] Cache invalidated");
    } catch (cacheErr) {
      console.warn(
        "[Appointment] Cache invalidation failed (non-critical):",
        cacheErr.message
      );
    }

    return appointmentId;
  } catch (error) {
    if (conn) {
      await conn.rollback()
    }
    console.error("[Appointment] ❌ Failed to create appointment:", {
      message: error.message,
      stack: error.stack,
      data: {
        tenant_id: data.tenant_id,
        clinic_id: data.clinic_id,
        patient_id: data.patient_id,
        appointment_date: data.appointment_date,
      },
    });

    throw new CustomError(
      `Failed to create appointment: ${error.message}`,
      error.statusCode || 500
    );
  } finally {
    if (conn && !connection) {
      // Only release if we created the connection
      await conn.release()
      //console.log("[Appointment] Database connection released");
    }
  }
};
// Get All Appointments by Tenant ID with Caching
const getAllAppointmentsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("appointment", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });

  try {
    const appointments = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentModel.getAllAppointmentsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });
    const convertedRows = appointments.data.map((appointment) =>
      helper.convertDbToFrontend(appointment, appointmentFieldsReverseMap)
    );

    return { data: convertedRows, total: appointments.total };
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

const getAllAppointmentsByTenantIdAndClinicId = async (
  tenantId,
  clinic_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("appointment", "list", {
    tenant_id: tenantId,
    clinic_id,
    page,
    limit,
  });

  try {
    const appointments = await getOrSetCache(cacheKey, async () => {
      const result =
        await appointmentModel.getAllAppointmentsByTenantIdAndClinicId(
          tenantId,
          clinic_id,
          Number(limit),
          offset
        );
      return result;
    });
    const convertedRows = appointments.data.map((appointment) =>
      helper.convertDbToFrontend(appointment, appointmentFieldsReverseMap)
    );

    return { data: convertedRows, total: appointments.total };
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

const getAllAppointmentsByTenantIdAndClinicIdByDentist = async (
  tenantId,
  clinic_id,
  dentist_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("appointment", "list", {
    tenant_id: tenantId,
    clinic_id,
    dentist_id,
    page,
    limit,
  });

  try {
    const appointments = await getOrSetCache(cacheKey, async () => {
      const result =
        await appointmentModel.getAllAppointmentsByTenantIdAndClinicIdByDentist(
          tenantId,
          clinic_id,
          dentist_id,
          Number(limit),
          offset
        );
      return result;
    });
    const convertedRows = appointments.data.map((appointment) =>
      helper.convertDbToFrontend(appointment, appointmentFieldsReverseMap)
    );

    return { data: convertedRows, total: appointments.total };
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

const getAllRoomIdByTenantIdAndClinicIdAndDentistId = async (
  tenantId,
  clinic_id,
  dentist_id
) => {
  try {
    const result =
      await appointmentModel.getAllRoomIdByTenantIdAndClinicIdAndDentistId(
        tenantId,
        clinic_id,
        dentist_id
      );
    return result;
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};
const getAllRoomIdByTenantIdAndClinicId = async (
  tenantId,
  clinic_id
) => {
  try {
    const result =
      await appointmentModel.getAllRoomIdByTenantIdAndClinicId(
        tenantId,
        clinic_id
      );
    return result;
  } catch (error) {
    console.error("Database error while fetching appointment roomid:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

const getAllRoomIdByTenantIdAndPatientId = async (tenantId, patient_id) => {
  try {
    const result = await appointmentModel.getAllRoomIdByTenantIdAndPatientId(
      tenantId,
      patient_id
    );
    return result;
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

const getAllAppointmentsByTenantIdAndAndDentistId = async (
  tenantId,
  dentist_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("appointment", "list", {
    tenant_id: tenantId,
    dentist_id,
    page,
    limit,
  });

  try {
    const appointments = await getOrSetCache(cacheKey, async () => {
      const result =
        await appointmentModel.getAllAppointmentsByTenantIdAndDentistId(
          tenantId,
          dentist_id,
          Number(limit),
          offset
        );
      return result;
    });
    const convertedRows = appointments.data.map((appointment) =>
      helper.convertDbToFrontend(appointment, appointmentFieldsReverseMap)
    );

    return { data: convertedRows, total: appointments.total };
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

const getAllAppointmentsByTenantIdAndPatientId = async (
  tenantId,
  patient_id,
  status,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("appointment", "list", {
    tenant_id: tenantId,
    patient_id,
    status,
    page,
    limit,
  });

  try {
    const appointments = await getOrSetCache(cacheKey, async () => {
      const result =
        await appointmentModel.getAllAppointmentsByTenantIdAndPatientId(
          tenantId,
          patient_id,
          status,
          Number(limit),
          offset
        );
      return result;
    });
    const convertedRows = appointments.data.map((appointment) =>
      helper.convertDbToFrontend(appointment, appointmentFieldsReverseMap)
    );

    return { data: convertedRows, total: appointments.total };
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
    // console.log(appointment)

    const convertedRows = helper.convertDbToFrontend(
      appointment,
      appointmentFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get appointment: " + error.message, 404);
  }
};

const getRoomIdByTenantIdAndAppointmentId = async (tenantId, appointmentId) => {
  try {
    const appointment =
      await appointmentModel.getRoomIdByTenantIdAndAppointmentId(
        tenantId,
        appointmentId
      );

    if (appointment === null)
      throw new CustomError("Appoinment not found", 404);

    // console.log(appointment)

    const convertedRows = {
      ...appointment,
      appointment_date: formatDateOnly(appointment.appointment_date),
      feedback: safeJsonParse(appointment.feedback),
      visit_reason: safeJsonParse(appointment.visit_reason),
      notes: safeJsonParse(appointment.notes),
      cancelled_reason: safeJsonParse(appointment.cancelled_reason),
      checkin_time: convertUTCToLocal(appointment.checkin_time),
      checkout_time: convertUTCToLocal(appointment.checkout_time),
    };

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

    await appointmentModel.updateAppointmentStats(
      data.tenant_id,
      data.clinic_id,
      data.appointment_date
    );

    await invalidateCacheByPattern("appointment:*");
    await invalidateCacheByPattern("appointmentsdetails:*");
    await invalidateCacheByPattern("patientvisitdetails:*");
    await invalidateCacheByPattern("appointmentsummary:*");
    await invalidateCacheByPattern("financeSummary:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update appointment", 404);
  }
};

const updateAppoinmentFeedback = async (
  appointment_id,
  tenant_id,
  details,
  status = "completed"
) => {
  try {
    const newRating = Number(details.doctor_rating ?? 0);

    // Step 1: Update appointment feedback
    const updated = await appointmentModel.updateAppoinmentFeedback(
      appointment_id,
      tenant_id,
      details,
      status,
      Number(details.feedback_display ?? 1) // still store it in DB
    );
    if (updated === 0)
      throw new CustomError("Appointment not found or no changes made.", 404);

    // Step 2: Invalidate cache
    const patterns = [
      "appointment:*",
      "appointmentsdetails:*",
      "patientvisitdetails:*",
      "appointmentsmonthlysummary:*",
      "financeSummary:*",
      "patient:*",
    ];
    await Promise.all(patterns.map(invalidateCacheByPattern));

    // Step 3: Get dentist details
    const dentistId =
      await appointmentModel.getDentistIdByTenantIdAndAppointmentId(
        tenant_id,
        appointment_id,
        status
      );
    if (!dentistId)
      throw new CustomError("Dentist not found for this appointment.", 404);

    const dentist = await getDentistByTenantIdAndDentistId(
      tenant_id,
      dentistId
    );
    if (!dentist) throw new CustomError("Dentist details not found.", 404);

    const currentRating = Number(dentist.ratings || 0);
    const currentCount = Number(dentist.reviews_count || 0);

    // Step 4: Always update rating and count
    const updatedCount = currentCount + 1;
    const updatedRating =
      (currentRating * currentCount + newRating) / updatedCount;

    // Step 5: Update dentist rating
    const result = await updateDentistRatingAndReviewCount(
      tenant_id,
      dentistId,
      updatedRating,
      updatedCount
    );
    if (result === 0)
      throw new CustomError("Dentist rating update failed.", 404);

    return result;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError(
      error.message || "Failed to update appointment",
      error.statusCode || 500
    );
  }
};

const updateAppoinmentFeedbackDisplay = async (
  appointment_id,
  tenant_id,
  status,
  feedback_display
) => {
  try {
    const result = await appointmentModel.updateAppoinmentFeedbackDisplay(
      appointment_id,
      tenant_id,
      status,
      feedback_display
    );
    const patterns = [
      "appointment:*",
      "appointmentsdetails:*",
      "patientvisitdetails:*",
      "appointmentsmonthlysummary:*",
      "financeSummary:*",
      "patient:*",
    ];
    await Promise.all(patterns.map(invalidateCacheByPattern));

    return result;
  } catch (error) {
    throw new CustomError(`Failed to delete dentist: ${error.message}`, 404);
  }
};

const updateAppoinmentStatus = async (
  appointment_id,
  tenant_id,
  clinic_id,
  details
) => {
  try {
    const affectedRows = await appointmentModel.updateAppoinmentStatus(
      appointment_id,
      tenant_id,
      clinic_id,
      details
    );

    if (affectedRows === 0) {
      throw new CustomError("Appointment not found or no changes made.", 404);
    }

    const payment=await getPaymentByTenantAndAppointmentId(tenant_id,appointment_id)

    const paid_amount = payment.reduce((acc, curr) => {
      return acc + (curr.amount || 0); // assuming "amount" field
    }, 0);

    if(details.status==='confirmed' && paid_amount>0){
      await appointmentModel.updateAppoinmentFinalStatus(appointment_id,tenant_id,clinic_id,'pending_payment')
    }
    if(details.status==='confirmed' && paid_amount===0){
      await appointmentModel.updateAppoinmentFinalStatus(appointment_id,tenant_id,clinic_id,'inprogress')
    }
    if(details.status==='completed' && paid_amount===0){
      await appointmentModel.updateAppoinmentFinalStatus(appointment_id,tenant_id,clinic_id,'completed')
    }

    const paymentsummary=await paymentService.getallPaymentSummaryByAppointment(tenant_id,appointment_id)

    if(paymentsummary.balance_remaining===0){
      await appointmentModel.updateAppoinmentFinalStatus(appointment_id,tenant_id,clinic_id,'fully_completed')
    }

    const appointment = await getAppointmentByTenantIdAndAppointmentId(
      tenant_id,
      appointment_id
    );

    await appointmentModel.updateAppointmentStats(
      tenant_id,
      clinic_id,
      appointment.dentist_id,
      appointment.appointment_date
    );

    await invalidateCacheByPattern("appointment:*");
    await invalidateCacheByPattern("appointmentsdetails:*");
    await invalidateCacheByPattern("patientvisitdetails:*");
    await invalidateCacheByPattern("appointmentsummary:*");
    await invalidateCacheByPattern("financeSummary:*");
    await invalidateCacheByPattern("patient:*");
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

    await appointmentModel.updateAppointmentStats(
      data.tenant_id,
      data.clinic_id,
      data.appointment_date
    );

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
  const cacheKey = buildCacheKey("appointment", "appointmentwithdetails", {
    tenant_id: tenantId,
    clinic_id,
    dentist_id,
    page,
    limit,
  });

  try {
    const appointment = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentModel.getAppointmentsWithDetails(
        tenantId,
        clinic_id,
        dentist_id,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = appointment.data.map((app) => ({
      ...app,
      date_of_birth: formatDateOnly(app.date_of_birth),
      visit_reason: safeJsonParse(app.visit_reason),
      appointment_date: formatDateOnly(app.appointment_date),
    }));

    return { data: convertedRows, total: appointment.total };
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

const getAppointmentsWithDetailsByClinic = async (
  tenantId,
  clinic_id,

  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("appointment", "appointmentwithdetails", {
    tenant_id: tenantId,
    clinic_id,

    page,
    limit,
  });

  try {
    const appointments = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentModel.getAppointmentsWithDetailsByClinic(
        tenantId,
        clinic_id,

        Number(limit),
        offset
      );
      return result;
    });
    const convertedRows = appointments.data.map((appointment) => ({
      ...appointment,
      visit_reason: safeJsonParse(appointment.visit_reason),
      date_of_birth: formatDateOnly(appointment.date_of_birth),
      appointment_date: formatDateOnly(appointment.appointment_date),
    }));
    return { data: convertedRows, total: appointments.total };
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

const getAppointmentsWithDetailsByPatient = async (
  tenantId,
  patient_id,
  status,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("appointment", "appointmentwithdetails", {
    tenant_id: tenantId,
    patient_id,
    status: status,
    page,
    limit,
  });
  const fieldsToDecode = ["visit_reason", "working_hours"];

  try {
    const appointment = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentModel.getAppointmentsWithDetailsByPatient(
        tenantId,
        patient_id,
        status,
        Number(limit),
        offset
      );

      if (result && Array.isArray(result.data)) {
        const formattedData = result.data.map((app) => ({
          ...app,
          appointment_date: new Date(app.appointment_date)
            .toISOString()
            .split("T")[0],
          date_of_birth: new Date(app.date_of_birth)
            .toISOString()
            .split("T")[0],
          date_of_birth: new Date(app.date_of_birth)
            .toISOString()
            .split("T")[0],
          visit_reason: safeJsonParse(app.visit_reason),
          date_of_birth: new Date(app.date_of_birth)
            .toISOString()
            .split("T")[0],
          working_hours: safeJsonParse(app.working_hours),
        }));
        return { ...result, data: formattedData };
      }
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

const getAppointmentMonthlySummaryClinic = async (tenantId, clinic_id) => {
  try {
    const cacheKey = `appointmentsmonthlysummary:${tenantId}/${clinic_id}`;
    const appointment = await getOrSetCache(cacheKey, async () => {
      const result = await appointmentModel.getAppointmentMonthlySummaryClinic(
        tenantId,
        clinic_id
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

      // Format appointment_date to 'YYYY-MM-DD'
      if (result && Array.isArray(result.data)) {
        const formattedData = result.data.map((app) => ({
          ...app,
          appointment_date: new Date(app.appointment_date)
            .toISOString()
            .split("T")[0],
        }));
        return { ...result, data: formattedData };
      }

      return result;
    });

    return appointment;
  } catch (error) {
    console.error("Database error while fetching appointment:", error);
    throw new CustomError("Failed to fetch appointment", 404);
  }
};

const isoWeek = require("dayjs/plugin/isoWeek");
const { buildCacheKey } = require("../utils/RedisCache");
const { getPaymentByTenantAndAppointmentId } = require("../models/PaymentModel");
dayjs.extend(isoWeek);

const getAppointmentSummary = async (tenant_id, clinic_id) => {
  const summary = {};

  const ranges = {
    weeks: Array.from({ length: 4 }, (_, i) => {
      const targetWeek = dayjs().subtract(i, "week");
      return {
        label: `${i + 1}w`,
        from: targetWeek.startOf("week").toDate(),
        to: targetWeek.endOf("week").toDate(),
      };
    }),

    months: Array.from({ length: 12 }, (_, i) => {
      const targetMonth = dayjs().subtract(i, "month");
      return {
        label: `${i + 1}m`,
        from: targetMonth.startOf("month").toDate(),
        to: targetMonth.endOf("month").toDate(),
      };
    }),

    years: Array.from({ length: 4 }, (_, i) => {
      const targetYear = dayjs().subtract(i, "year");
      return {
        label: `${i + 1}y`,
        from: targetYear.startOf("year").toDate(),
        to: targetYear.endOf("year").toDate(),
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

    rows.forEach((row) => {
      result.total_appointments += row.count;
      if (row.status === "completed") result.completed_appointments = row.count;
      else if (row.status === "scheduled")
        result.pending_appointments = row.count;
      else if (row.status === "cancelled")
        result.cancelled_appointments = row.count;
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
    acc.completed_appointments += parseInt(
      newStats.completed_appointments || 0
    );
    acc.pending_appointments += parseInt(newStats.pending_appointments || 0);
    acc.cancelled_appointments += parseInt(
      newStats.cancelled_appointments || 0
    );
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
      cumulativeStats = mergeStats({ ...cumulativeStats }, currentStats);

      // Save cumulative value directly under the label (e.g., "2w", "3m", "1y")
      summary[item.label] = {
        total_appointments: cumulativeStats.total_appointments,
        completed_appointments:
          cumulativeStats.completed_appointments.toString(),
        pending_appointments: cumulativeStats.pending_appointments.toString(),
        cancelled_appointments:
          cumulativeStats.cancelled_appointments.toString(),
      };
    }
  }

  return summary;
};

const getAppointmentSummaryByDentist = async (
  tenant_id,
  clinic_id,
  dentist_id
) => {
  const summary = {};

  const ranges = {
    weeks: Array.from({ length: 4 }, (_, i) => {
      const targetWeek = dayjs().subtract(i, "week");
      return {
        label: `${i + 1}w`,
        from: targetWeek.startOf("week").toDate(),
        to: targetWeek.endOf("week").toDate(),
      };
    }),

    months: Array.from({ length: 12 }, (_, i) => {
      const targetMonth = dayjs().subtract(i, "month");
      return {
        label: `${i + 1}m`,
        from: targetMonth.startOf("month").toDate(),
        to: targetMonth.endOf("month").toDate(),
      };
    }),

    years: Array.from({ length: 4 }, (_, i) => {
      const targetYear = dayjs().subtract(i, "year");
      return {
        label: `${i + 1}y`,
        from: targetYear.startOf("year").toDate(),
        to: targetYear.endOf("year").toDate(),
      };
    }),
  };

  const fetchDataForRange = async (from, to) => {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM appointment
       WHERE tenant_id = ? AND clinic_id = ? AND dentist_id=? AND created_time BETWEEN ? AND ?
       GROUP BY status`,
      [tenant_id, clinic_id, dentist_id, from, to]
    );

    const result = {
      total_appointments: 0,
      completed_appointments: 0,
      pending_appointments: 0,
      cancelled_appointments: 0,
    };

    rows.forEach((row) => {
      result.total_appointments += row.count;
      if (row.status === "completed") result.completed_appointments = row.count;
      else if (row.status === "scheduled")
        result.pending_appointments = row.count;
      else if (row.status === "cancelled")
        result.cancelled_appointments = row.count;
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
    acc.completed_appointments += parseInt(
      newStats.completed_appointments || 0
    );
    acc.pending_appointments += parseInt(newStats.pending_appointments || 0);
    acc.cancelled_appointments += parseInt(
      newStats.cancelled_appointments || 0
    );
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
      cumulativeStats = mergeStats({ ...cumulativeStats }, currentStats);

      // Save cumulative value directly under the label (e.g., "2w", "3m", "1y")
      summary[item.label] = {
        total_appointments: cumulativeStats.total_appointments,
        completed_appointments:
          cumulativeStats.completed_appointments.toString(),
        pending_appointments: cumulativeStats.pending_appointments.toString(),
        cancelled_appointments:
          cumulativeStats.cancelled_appointments.toString(),
      };
    }
  }

  return summary;
};

const getAppointmentSummaryChartByClinic = async (tenant_id, clinic_id) => {
  const cacheData = `appointments:count:tenant:${tenant_id}:clinic:${clinic_id}`;
  const rows = await getOrSetCache(cacheData, async () => {
    const now = dayjs();

    // === Daily data for current week (Mon - Sun) - already newest to oldest (today first) ===
    const weekStart = now.startOf("week");
    const weekData = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = weekStart.add(i, "day").startOf("day").toDate();
      const dayEnd = weekStart.add(i, "day").endOf("day").toDate();
      const total = await appointmentModel.fetchDataForRange(dayStart, dayEnd);
      weekData.push(total);
    }

    // === Weekly totals (4 weeks): newest -> oldest ===
    const fourWeeks = [];
    for (let i = 0; i < 4; i++) {
      const from = now.subtract(i, "week").startOf("week").toDate();
      const to = now.subtract(i, "week").endOf("week").toDate();
      const total = await appointmentModel.fetchDataForRange(
        tenant_id,
        clinic_id,
        from,
        to
      );
      fourWeeks.push(total); // [this week, last week, ...]
    }

    // === Monthly totals (12 months): newest -> oldest ===
    const monthTotals = [];
    for (let i = 0; i < 12; i++) {
      const from = now.subtract(i, "month").startOf("month").toDate();
      const to = now.subtract(i, "month").endOf("month").toDate();
      const total = await appointmentModel.fetchDataForRange(
        tenant_id,
        clinic_id,
        from,
        to
      );
      monthTotals.push(total); // [current month, last month, ...]
    }

    // === Yearly totals (4 years): newest -> oldest ===
    const yearTotals = [];
    for (let i = 0; i < 4; i++) {
      const from = now.subtract(i, "year").startOf("year").toDate();
      const to = now.subtract(i, "year").endOf("year").toDate();
      const total = await appointmentModel.fetchDataForRange(
        tenant_id,
        clinic_id,
        from,
        to
      );
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
  });

  return rows;
};

const getAppointmentSummaryChartByDentist = async (
  tenant_id,
  clinic_id,
  dentist_id
) => {
  const fetchDataForRange = async (from, to) => {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM appointment
       WHERE tenant_id = ? AND clinic_id = ? AND dentist_id=? AND created_time BETWEEN ? AND ?
       GROUP BY status`,
      [tenant_id, clinic_id, dentist_id, from, to]
    );
    const result = { CP: 0, SC: 0, CL: 0 };
    rows.forEach((row) => {
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

async function getAppointmentSummaryByStartDateAndEndDate(
  tenant_id,
  startDate,
  endDate,
  clinic_id = null,  // Default to null
  dentist_id = null  // Default to null
) {
  // === 1. Normalize inputs for consistent cache keys ===
  const normalizedClinicId = clinic_id && !isNaN(clinic_id) ? Number(clinic_id) : null;
  const normalizedDentistId = dentist_id && !isNaN(dentist_id) ? Number(dentist_id) : null;
  
  const cacheKey = buildCacheKey("appointment", "appointmentsummary", {
    tenant_id: Number(tenant_id),
    clinic_id: normalizedClinicId,
    dentist_id: normalizedDentistId,
    startDate,
    endDate,
  });

  try {
    // === 2. Add timeout wrapper around cache operation ===
    const appointments = await Promise.race([
      getOrSetCache(cacheKey, async () => {
        // === 3. Normalize dates for DB compatibility ===
        const normalizedStartDate = formatDateOnly(startDate); // Ensure "YYYY-MM-DD"
        const normalizedEndDate = formatDateOnly(endDate);
        
        const queryParams = [tenant_id, normalizedStartDate, normalizedEndDate];

        // === 4. Simplified, optimized SQL query ===
        let query = `
          SELECT 
            a.stat_date AS date,
            COALESCE(SUM(a.confirmed), 0) AS confirmed,
            COALESCE(SUM(a.completed), 0) AS completed,
            COALESCE(SUM(a.cancelled), 0) AS cancelled
          FROM appointment_stats a
          WHERE a.tenant_id = ?
            AND a.stat_date BETWEEN ? AND ?
        `;

        // Optional: Filter by clinic
        if (normalizedClinicId) {
          query += ` AND a.clinic_id = ?`;
          queryParams.push(normalizedClinicId);
        }

        // Optional: Filter by dentist - SIMPLIFIED (no EXISTS subquery)
        if (normalizedDentistId) {
          // ✅ Join directly with appointment_stats if it has dentist_id
          // If NOT, use a simpler approach: pre-fetch dentist's appointment dates
          query += ` AND a.dentist_id = ?`;  // ← Add dentist_id column to appointment_stats!
          queryParams.push(normalizedDentistId);
        }

        query += ` GROUP BY a.stat_date ORDER BY a.stat_date`;

        try {
          // === 5. Add query timeout protection ===
          const [rows] = await Promise.race([
            pool.query(query, queryParams),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Query timeout')), 10000) // 10 second timeout
            )
          ]);

          return rows.map((row) => ({
            date: formatDateOnly(row.date),
            confirmed: Number(row.confirmed) || 0,
            completed: Number(row.completed) || 0,
            cancelled: Number(row.cancelled) || 0,
          }));
        } catch (queryError) {
          console.error("❌ Error fetching appointment summary:", {
            query,
            queryParams,
            error: queryError.message,
          });
          throw new CustomError("Error fetching appointment summary", 500);
        }
      }),
      // === 6. Cache operation timeout ===
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Cache operation timeout')), 15000) // 15 second timeout
      )
    ]);
    
    return appointments;
    
  } catch (err) {
    console.error("❌ Failed to fetch appointment summary:", {
      tenant_id,
      startDate,
      endDate,
      clinic_id,
      dentist_id,
      error: err.message,
    });
    
    // Return empty array instead of throwing for better UX
    return [];
    // OR throw if you prefer:
    // throw new CustomError("Failed to fetch appointment summary", 404);
  }
}

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
  updateAppoinmentStatus,
  getAppointmentSummary,
  getAppointmentSummaryByDentist,
  getAppointmentSummaryChartByClinic,
  getAppointmentSummaryChartByDentist,
  getAllAppointmentsByTenantIdAndClinicId,
  getAllAppointmentsByTenantIdAndClinicIdByDentist,
  getAppointmentsWithDetailsByPatient,
  getAllAppointmentsByTenantIdAndAndDentistId,
  getAllAppointmentsByTenantIdAndPatientId,
  getAllRoomIdByTenantIdAndClinicIdAndDentistId,
  getAllRoomIdByTenantIdAndPatientId,
  updateAppoinmentFeedback,
  getRoomIdByTenantIdAndAppointmentId,
  getAppointmentSummaryByStartDateAndEndDate,
  updateAppoinmentFeedbackDisplay,
  getAppointmentMonthlySummaryClinic,
  getAppointmentsWithDetailsByClinic,
  getAllRoomIdByTenantIdAndClinicId
};
