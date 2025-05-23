const appointmentService = require("../services/AppointmentService");
const appointmentValidation = require("../validations/AppointmentValidation");

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

  try {
    const appointments = await appointmentService.getAllAppointmentsByTenantId(tenant_id, page, limit);
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
    // Validate if appointment exists
    await appointmentValidation.checkAppointmentExistsByIdValidation(tenant_id, appointment_id);

    // Fetch appointment details
    const appointment = await appointmentService.getAppointmentByTenantIdAndAppointmentId(tenant_id, appointment_id);
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
    await appointmentValidation.checkAppointmentExistsByIdValidation(tenant_id, appointment_id);

    // Validate update input
    await appointmentValidation.updateAppointmentValidation(appointment_id, details, tenant_id);

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
      throw new Error("Updated appointment overlaps with another existing appointment.");
    }

    // Update the appointment
    await appointmentService.updateAppointment(appointment_id, details, tenant_id);
    res.status(200).json({ message: "Appointment updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete an appointment by ID and tenant ID
 */
exports.deleteAppointmentByTenantIdAndAppointmentId = async (req, res, next) => {
  const { appointment_id, tenant_id } = req.params;

  try {
    // Validate if appointment exists
    await appointmentValidation.checkAppointmentExistsByIdValidation(tenant_id, appointment_id);

    // Delete the appointment
    await appointmentService.deleteAppointmentByTenantIdAndAppointmentId(tenant_id, appointment_id);
    res.status(200).json({ message: "Appointment deleted successfully" });
  } catch (err) {
    next(err);
  }
};

exports.getAppointmentsWithDetails = async (req, res, next) => {
  const { tenant_id,clinic_id,dentist_id } = req.params;
  const {page,limit}=req.query
  try {
    const appointments = await appointmentService.getAppointmentsWithDetails(tenant_id,clinic_id,dentist_id, page, limit);
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};

exports.getAppointmentMonthlySummary = async (req, res, next) => {
  const { tenant_id,clinic_id,dentist_id } = req.params;

  try {
    const appointments = await appointmentService.getAppointmentMonthlySummary(tenant_id,clinic_id,dentist_id);
    res.status(200).json(appointments);
  } catch (err) {
    next(err);
  }
};