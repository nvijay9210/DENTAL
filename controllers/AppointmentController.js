const { CustomError } = require("../middlewares/CustomeError");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const appointmentService = require("../services/AppointmentService");
const { dateToString } = require("../utils/DateUtils");
const { logUserViewActivity } = require("../utils/UserActivityUtil");
const appointmentValidation = require("../validations/AppointmentValidation");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");
const { bulkInsert } = require("../Modules/BulkInsert");
const  pool  = require("../config/db");
const { uploadFileMiddleware2 } = require("../utils/UploadFiles");
/**
 * Create a new appointment
 */


// controllers/appointmentController.js

exports.createPatientAndBookAppointment = async (req, res) => {
  console.log('🎯 Controller hit - createPatientAndBookAppointment');
  
  // 1️⃣ Extract & Validate Payload
  const {
    tenant_id = 1,
    first_name,
    last_name,
    email,
    phone_number,
    date_of_birth,
    gender = "M",
    blood_group,
    address,
    city,
    state,
    country,
    pin_code,
    smoking_status,
    alcohol_consumption,
    emergency_contact_name,
    emergency_contact_number,
    clinic_id,
    dentist_id,
    appointment_date,
    start_time,
    end_time,
    mode_of_payment = "Cash",
    visit_reason,
    consultation_fee = 300.0,
    min_booking_fee = 200.0,
    created_by = "WebPortal",
    appointment_type = "video"
  } = req.body;

  console.log('📥 Received payload:', req.body);

  // Basic validation
  const requiredFields = { first_name, last_name, phone_number, clinic_id, dentist_id, appointment_date, start_time, end_time };
  const missing = Object.entries(requiredFields).filter(([_, val]) => !val).map(([key]) => key);
  
  if (missing.length > 0) {
    return res.status(400).json({ 
      success: false, 
      message: `Missing required fields: ${missing.join(', ')}` 
    });
  }

  let connection;
  
  try {
    // ✅ Get connection using promise-based pool
    connection = await pool.getConnection();
    console.log('🔗 Database connection acquired');
    
    // Start transaction
    await connection.beginTransaction();
    console.log('🔄 Transaction started');

    // Generate unique patient code
    const patient_code = `MYDPAT${Date.now().toString().slice(-6)}`;

    // 2️⃣ INSERT Patient
    const [patientRes] = await connection.query(`
      INSERT INTO patient (
        tenant_id, patient_code, first_name, last_name, email, phone_number, 
        date_of_birth, gender, blood_group, address, city, state, country, 
        pin_code, smoking_status, alcohol_consumption, emergency_contact_name, 
        emergency_contact_number, created_by, created_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      tenant_id, patient_code, first_name, last_name, email || null, phone_number,
      date_of_birth, gender, blood_group || null, address, city, state, country,
      pin_code, smoking_status, alcohol_consumption, emergency_contact_name,
      emergency_contact_number, created_by
    ]);
    
    const patient_id = patientRes.insertId;
    console.log('👤 Patient created:', { patient_id, patient_code });

    // 3️⃣ INSERT Patient-Clinic Link (ignore duplicate if exists)
    await connection.query(`
      INSERT IGNORE INTO patient_clinic (patient_id, clinic_id, created_by, created_time)
      VALUES (?, ?, ?, NOW())
    `, [patient_id, clinic_id, created_by]);
    console.log('🔗 Patient linked to clinic');

    // 4️⃣ INSERT Appointment
    const [apptRes] = await connection.query(`
      INSERT INTO appointment (
        tenant_id, patient_id, dentist_id, clinic_id, room_id, appointment_date, 
        start_time, end_time, status, appointment_final_status, appointment_type,
        visit_reason, mode_of_payment, consultation_fee, min_booking_fee, 
        payment_status, created_by, created_time
      ) VALUES (?, ?, ?, ?, '00000000-0000-0000-0000-000000000000', ?, ?, ?, 'pending', 'pending', ?, ?, ?, ?, ?, 'pending', ?, NOW())
    `, [
      tenant_id, patient_id, dentist_id, clinic_id, 
      appointment_date, start_time, end_time, 
      appointment_type,
      visit_reason || null, mode_of_payment, consultation_fee, 
      min_booking_fee, created_by
    ]);
    
    const appointment_id = apptRes.insertId;
    console.log('📅 Appointment created:', { appointment_id });

    // 5️⃣ UPDATE/UPSERT Appointment Stats
    await connection.query(`
      INSERT INTO appointment_stats (tenant_id, clinic_id, dentist_id, stat_date, confirmed, created_by, created_time)
      VALUES (?, ?, ?, DATE(?), 1, ?, NOW())
      ON DUPLICATE KEY UPDATE confirmed = confirmed + 1
    `, [tenant_id, clinic_id, dentist_id, appointment_date, created_by]);
    console.log('📊 Stats updated');

    // ✅ COMMIT Transaction
    await connection.commit();
    console.log('✅ Transaction committed successfully');

    // 🟢 Success Response
    return res.status(201).json({
      success: true,
      message: "Patient registered and appointment booked successfully.",
      data: {
        patient_id,
        patient_code,
        appointment_id,
        clinic_id,
        dentist_id,
        appointment_date,
        start_time,
        end_time,
        consultation_fee,
        min_booking_fee
      }
    });

  } catch (error) {
    // 🔄 ROLLBACK on error
    if (connection) {
      try {
        await connection.rollback();
        console.log('🔄 Transaction rolled back');
      } catch (rollbackErr) {
        console.error('❌ Rollback failed:', rollbackErr);
      }
    }
    
    console.error("❌ Booking Transaction Failed:", error);
    
    // Handle specific MySQL errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: "Conflict: A record with this unique identifier already exists.",
        error: process.env.NODE_ENV === 'development' ? error.sqlMessage : null
      });
    }
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        message: "Invalid reference: Clinic or Dentist ID does not exist.",
        error: process.env.NODE_ENV === 'development' ? error.sqlMessage : null
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during booking.",
      error: process.env.NODE_ENV === 'development' ? error.message : null,
      code: error.code
    });
    
  } finally {
    // 🔓 Always release connection
    if (connection) {
      connection.release();
      console.log('🔓 Connection released to pool');
    }
  }
};

exports.createAppointment = async (req, res, next) => {
  try {
    const response = await bulkInsert(
      req.body,
      appointmentValidation.createAppointmentValidation,
      appointmentService.createAppointment
    );
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

/**
 * Get all appointments by tenant ID with pagination
 */
exports.getAllAppointmentsByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const appointments = await appointmentService.getAllAppointmentsByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getRoomIdByTenantIdAndAppointmentId = async (req, res, next) => {
  const { tenant_id, appointment_id } = req.params;
  checkIfExists("appointment", "appointment_id", appointment_id, tenant_id);
  try {
    const appointments =
      await appointmentService.getRoomIdByTenantIdAndAppointmentId(
        tenant_id,
        appointment_id
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getAllAppointmentsByTenantIdAndClinicId = async (req, res, next) => {
  const { tenant_id, clinic_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const appointments =
      await appointmentService.getAllAppointmentsByTenantIdAndClinicId(
        tenant_id,
        clinic_id,
        page,
        limit
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getAllAppointmentsByTenantIdAndClinicIdByDentist = async (
  req,
  res,
  next
) => {
  const { tenant_id, clinic_id, dentist_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  await checkIfIdExists("tenant", "tenant_id", tenant_id);
  await checkIfIdExists("clinic", "clinic_id", clinic_id);
  await checkIfIdExists("dentist", "dentist_id", dentist_id);
  try {
    const appointments =
      await appointmentService.getAllAppointmentsByTenantIdAndClinicIdByDentist(
        tenant_id,
        clinic_id,
        dentist_id,
        page,
        limit
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getAllRoomIdByTenantIdAndClinicIdAndDentistId = async (
  req,
  res,
  next
) => {
  const { tenant_id, clinic_id, dentist_id } = req.params;
  await checkIfIdExists("tenant", "tenant_id", tenant_id);
  await checkIfIdExists("clinic", "clinic_id", clinic_id);
  await checkIfIdExists("dentist", "dentist_id", dentist_id);
  try {
    const appointments =
      await appointmentService.getAllRoomIdByTenantIdAndClinicIdAndDentistId(
        tenant_id,
        clinic_id,
        dentist_id
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};
exports.getAllRoomIdByTenantIdAndClinicId = async (
  req,
  res,
  next
) => {
  const { tenant_id, clinic_id, dentist_id } = req.params;
  await checkIfIdExists("tenant", "tenant_id", tenant_id);
  await checkIfIdExists("clinic", "clinic_id", clinic_id);
  try {
    const appointments =
      await appointmentService.getAllRoomIdByTenantIdAndClinicId(
        tenant_id,
        clinic_id
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getAllRoomIdByTenantIdAndPatientId = async (req, res, next) => {
  const { tenant_id, patient_id } = req.params;
  await checkIfIdExists("tenant", "tenant_id", tenant_id);
  await checkIfIdExists("patient", "patient_id", patient_id);
  try {
    const appointments =
      await appointmentService.getAllRoomIdByTenantIdAndPatientId(
        tenant_id,
        patient_id
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getAllAppointmentsByTenantIdAndDentistId = async (req, res, next) => {
  const { tenant_id, dentist_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  await checkIfIdExists("tenant", "tenant_id", tenant_id);
  await checkIfIdExists("dentist", "dentist_id", dentist_id);
  try {
    const appointments =
      await appointmentService.getAllAppointmentsByTenantIdAndAndDentistId(
        tenant_id,
        dentist_id,
        page,
        limit
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
}; 

exports.getAllAppointmentsByTenantIdAndPatientId = async (req, res, next) => {
  const { tenant_id, patient_id } = req.params;
  const { status, page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  await checkIfIdExists("tenant", "tenant_id", tenant_id);
  await checkIfIdExists("patient", "patient_id", patient_id);
  try {
    const appointments =
      await appointmentService.getAllAppointmentsByTenantIdAndPatientId(
        tenant_id,
        patient_id,
        status,
        page,
        limit
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

/**
 * Get appointment by tenant and appointment ID
 */
exports.getAppointmentByTenantIdAndAppointmentId = async (req, res, next) => {
  const { appointment_id, tenant_id } = req.params;

  try {
    const appointment1 = await checkIfExists(
      "appointment",
      "appointment_id",
      appointment_id,
      tenant_id
    );

    if (!appointment1) throw new CustomError("Appointment not found", 404);

    // Fetch appointment details
    const appointment =
      await appointmentService.getAppointmentByTenantIdAndAppointmentId(
        tenant_id,
        appointment_id
      );
    res.status(200).json(appointment);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing appointment
 */
exports.updateAppointment = async (req, res, next) => {
  const { appointment_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate if appointment exists before update
    const appointment1 = await checkIfExists(
      "appointment",
      "appointment_id",
      appointment_id,
      tenant_id
    );

    if (!appointment1) throw new CustomError("Appointment not found", 404);

    // Validate update input
    await appointmentValidation.updateAppointmentValidation(
      appointment_id,
      details,
      tenant_id
    );

    // Check for overlapping appointments (skipping current one)
    const isOverlapping = await appointmentService.checkOverlappingAppointment(
      tenant_id,
      details.clinic_id || null,
      details.patient_id || null,
      details.dentist_id || null,
      {
        appointment_date: details.appointment_date,
        start_time: details.start_time,
        end_time: details.end_time,
      },
      appointment_id
    );

    if (isOverlapping) {
      throw new Error(
        "Updated appointment overlaps with another existing appointment."
      );
    }

    // Update the appointment
    await appointmentService.updateAppointment(
      appointment_id,
      details,
      tenant_id
    );
    res.status(200).json({ message: "Appointment updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.updateAppoinmentStatus = async (req, res, next) => {
  const { appointment_id, tenant_id, clinic_id } = req.params;
  const details = req.body;
  try {
    // Validate if appointment exists before update
    const appointment1 = await checkIfExists(
      "appointment",
      "appointment_id",
      appointment_id,
      tenant_id
    );

    if (!appointment1) throw new CustomError("Appointment not found", 404);

    // Update the appointment
    await appointmentService.updateAppoinmentStatus(
      appointment_id,
      tenant_id,
      clinic_id,
      details
    );
    res
      .status(200)
      .json({ message: "Appointment status updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.updateAppoinmentFeedback = async (req, res, next) => {
  const { appointment_id, tenant_id } = req.params;
  const details = req.body;
  details["feedback_display"] = 1;
  try {
    // Validate if appointment exists before update
    const appointment1 = await checkIfExists(
      "appointment",
      "appointment_id",
      appointment_id,
      tenant_id
    );

    if (!appointment1) throw new CustomError("Appointment not found", 404);

    // Update the appointment
    await appointmentService.updateAppoinmentFeedback(
      appointment_id,
      tenant_id,
      details
    );
    res.status(200).json({
      message: "Appointment and Dentist Feedback updated successfully",
    });
  } catch (err) {
    next(err);
  }
};
exports.updateAppoinmentFeedbackDisplay = async (req, res, next) => {
  const { appointment_id, tenant_id } = req.params;
  const { feedback_display } = req.query;
  const status = "completed";
  try {
    // Validate if appointment exists before update
    const appointment1 = await checkIfExists(
      "appointment",
      "appointment_id",
      appointment_id,
      tenant_id
    );

    if (!appointment1) throw new CustomError("Appointment not found", 404);

    // Update the appointment
    await appointmentService.updateAppoinmentFeedbackDisplay(
      appointment_id,
      tenant_id,
      status,
      feedback_display
    );
    res.status(200).json({
      message: "Appointment and Dentist Feedback updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete an appointment by ID and tenant ID
 */
exports.deleteAppointmentByTenantIdAndAppointmentId = async (
  req,
  res,
  next
) => {
  const { appointment_id, tenant_id } = req.params;

  try {
    // Validate if appointment exists
    const appointment1 = await checkIfExists(
      "appointment",
      "appointment_id",
      appointment_id,
      tenant_id
    );

    if (!appointment1) throw new CustomError("Appointment not found", 404);
    // Delete the appointment
    await appointmentService.deleteAppointmentByTenantIdAndAppointmentId(
      tenant_id,
      appointment_id
    );
    res.status(200).json({ message: "Appointment deleted successfully" });
  } catch (err) {
    next(err);
  }
};

exports.getAppointmentsWithDetails = async (req, res, next) => {
  const { tenant_id, clinic_id, dentist_id } = req.params;
  const {  page, limit } = req.query;
  try {
    await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
    await checkIfIdExists("tenant", "tenant_id", tenant_id);
    await checkIfIdExists("clinic", "clinic_id", clinic_id);
    await checkIfIdExists("dentist", "dentist_id", dentist_id);
    const appointments = await appointmentService.getAppointmentsWithDetails(
      tenant_id,
      clinic_id,
      dentist_id,
      page,
      limit
    );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};
exports.getAppointmentsWithDetailsByClinic = async (req, res, next) => {
  const { tenant_id, clinic_id } = req.params;
  const {  page, limit } = req.query;
  try {
    await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
    await checkIfIdExists("tenant", "tenant_id", tenant_id);
    await checkIfIdExists("clinic", "clinic_id", clinic_id);
    const appointments =
      await appointmentService.getAppointmentsWithDetailsByClinic(
        tenant_id,
        clinic_id,
        
        page,
        limit
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

// status=pending pending+cofirmed and completed

exports.getAppointmentsWithDetailsByPatient = async (req, res, next) => {
  const { tenant_id, patient_id } = req.params;
  const { status, page, limit } = req.query;
  try {
    await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
    await checkIfIdExists("patient", "patient_id", patient_id);
    const appointments =
      await appointmentService.getAppointmentsWithDetailsByPatient(
        tenant_id,
        patient_id,
        status,
        page,
        limit
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getAppointmentMonthlySummary = async (req, res, next) => {
  const { tenant_id, clinic_id, dentist_id } = req.params;
  await checkIfIdExists("tenant", "tenant_id", tenant_id);
  await checkIfIdExists("clinic", "clinic_id", clinic_id);
  await checkIfIdExists("dentist", "dentist_id", dentist_id);
  try {
    const appointments = await appointmentService.getAppointmentMonthlySummary(
      tenant_id,
      clinic_id,
      dentist_id
    );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getAppointmentMonthlySummaryClinic = async (req, res, next) => {
  const { tenant_id, clinic_id } = req.params;
  await checkIfIdExists("tenant", "tenant_id", tenant_id);
  await checkIfIdExists("clinic", "clinic_id", clinic_id);
  try {
    const appointments =
      await appointmentService.getAppointmentMonthlySummaryClinic(
        tenant_id,
        clinic_id
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getAppointmentSummary = async (req, res, next) => {
  const { tenant_id, clinic_id } = req.params;
  const { dentist_id, startDate, endDate } = req.query;
  await checkIfIdExists("tenant", "tenant_id", tenant_id);
  await checkIfIdExists("clinic", "clinic_id", clinic_id);
  // if(period!=='monthly' && period!=='yearly' && period!=='weekly') throw new CustomError('Period mustbe a weekly,monthly or yearly',400)
  try {
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Start and end dates are required." });
    }
    const appointments =
      await appointmentService.getAppointmentSummaryByStartDateAndEndDate(
        parseInt(tenant_id),
        dateToString(startDate),
        dateToString(endDate),
        parseInt(clinic_id),
        parseInt(dentist_id)
        // period
      );
      await logUserViewActivity(req,'/getallappointments/periodsummary/')
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getAppointmentSummaryByDentist = async (req, res, next) => {
  const { tenant_id, clinic_id, dentist_id } = req.params;
  const { period } = req.query;
  await checkIfIdExists("tenant", "tenant_id", tenant_id);
  await checkIfIdExists("clinic", "clinic_id", clinic_id);
  await checkIfIdExists("dentist", "dentist_id", dentist_id);
  if (period !== "monthly" && period !== "yearly")
    throw new CustomError("Period mustbe a monthly or yearly", 400);
  try {
    const appointments =
      await appointmentService.getAppointmentSummaryByDentist(
        tenant_id,
        clinic_id,
        dentist_id,
        period
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getAppointmentSummaryChartByClinic = async (req, res, next) => {
  const { tenant_id, clinic_id } = req.params;
  // const{period}=req.query
  await checkIfIdExists("tenant", "tenant_id", tenant_id);
  await checkIfIdExists("clinic", "clinic_id", clinic_id);
  // if(period!=='monthly' && period!=='yearly' && period!=='weekly') throw new CustomError('Period mustbe a weekly,monthly or yearly',400)
  try {
    const appointments =
      await appointmentService.getAppointmentSummaryChartByClinic(
        tenant_id,
        clinic_id
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};
exports.getAppointmentSummaryChartByDentist = async (req, res, next) => {
  const { tenant_id, clinic_id, dentist_id } = req.params;
  // const{period}=req.query
  await checkIfIdExists("tenant", "tenant_id", tenant_id);
  await checkIfIdExists("clinic", "clinic_id", clinic_id);
  await checkIfIdExists("dentist", "dentist_id", dentist_id);

  try {
    const appointments =
      await appointmentService.getAppointmentSummaryChartByDentist(
        tenant_id,
        clinic_id,
        dentist_id
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getPatientVisitDetailsByPatientIdAndTenantIdAndClinicId = async (
  req,
  res,
  next
) => {
  const { tenant_id, clinic_id, patient_id } = req.params;
  const { limit, page } = req.query;

  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  await checkIfIdExists("clinic", "clinic_id", clinic_id);
  await checkIfIdExists("patient", "patient_id", patient_id);

  try {
    const appointments =
      await appointmentService.getPatientVisitDetailsByPatientIdAndTenantIdAndClinicId(
        tenant_id,
        clinic_id,
        patient_id,
        page,
        limit
      );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};
