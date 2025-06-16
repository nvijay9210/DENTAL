const { CustomError } = require("../middlewares/CustomeError");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const appointmentService = require("../services/AppointmentService");
const appointmentValidation = require("../validations/AppointmentValidation");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");

/**
 * Create a new appointment
 */
exports.createAppointment = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate appointment data
    await appointmentValidation.createAppointmentValidation(details);

    // Create the appointment
    const id = await appointmentService.createAppointment(details);
    res.status(201).json({ message: "Appointment created", id });
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

exports.getAllAppointmentsByTenantIdAndClinicId = async (req, res, next) => {
  const { tenant_id,clinic_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const appointments = await appointmentService.getAllAppointmentsByTenantIdAndClinicId(
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

exports.getAllAppointmentsByTenantIdAndClinicIdByDentist = async (req, res, next) => {
  const { tenant_id,clinic_id,dentist_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  await checkIfIdExists('dentist','dentist_id',dentist_id)
  try {
    const appointments = await appointmentService.getAllAppointmentsByTenantIdAndClinicIdByDentist(
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

exports.getAllRoomIdByTenantIdAndClinicIdAndDentistId = async (req, res, next) => {
  const { tenant_id,clinic_id,dentist_id } = req.params;
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  await checkIfIdExists('dentist','dentist_id',dentist_id)
  try {
    const appointments = await appointmentService.getAllRoomIdByTenantIdAndClinicIdAndDentistId(
      tenant_id,
      clinic_id,
      dentist_id,
      
    );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getAllRoomIdByTenantIdAndClinicIdAndPatientId = async (req, res, next) => {
  const { tenant_id,clinic_id,patient_id } = req.params;
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('clinic','clinic_id',clinic_id)
  await checkIfIdExists('patient','patient_id',patient_id)
  try {
    const appointments = await appointmentService.getAllRoomIdByTenantIdAndClinicIdAndPatientId(
      tenant_id,
      clinic_id,
      patient_id
    );
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getAllAppointmentsByTenantIdAndDentistId = async (req, res, next) => {
  const { tenant_id,dentist_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('dentist','dentist_id',dentist_id)
  try {
    const appointments = await appointmentService.getAllAppointmentsByTenantIdAndAndDentistId(
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
  const { tenant_id,patient_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  await checkIfIdExists('tenant','tenant_id',tenant_id)
  await checkIfIdExists('patient','patient_id',patient_id)
  try {
    const appointments = await appointmentService.getAllAppointmentsByTenantIdAndPatientId(
      tenant_id,
      patient_id,
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
  const details=req.body
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
  const { page, limit } = req.query;
  try {
    await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
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

exports.getAppointmentsWithDetailsByPatient = async (req, res, next) => {
  const { tenant_id,patient_id } = req.params;
  const { page, limit } = req.query;
  try {
    await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
    await checkIfIdExists("patient", "patient_id", patient_id);
    const appointments = await appointmentService.getAppointmentsWithDetailsByPatient(
      tenant_id,
      patient_id,
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

exports.getAppointmentSummary = async (req, res, next) => {
  const { tenant_id, clinic_id } = req.params;
  // const{period}=req.query
  await checkIfIdExists("tenant", "tenant_id", tenant_id);
  await checkIfIdExists("clinic", "clinic_id", clinic_id);
  // if(period!=='monthly' && period!=='yearly' && period!=='weekly') throw new CustomError('Period mustbe a weekly,monthly or yearly',400)
  try {
    const appointments = await appointmentService.getAppointmentSummary(
      tenant_id,
      clinic_id
      // period
    );
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
