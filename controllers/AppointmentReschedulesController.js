const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const appointmentReschedulesService = require("../services/AppointmentReschedulesService");
const { isValidDate } = require("../utils/DateUtils");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");
const appointmentReschedulesValidation = require("../validations/AppointmentReschedulesValidation");

/**
 * Create a new appointmentReschedules
 */
exports.createAppointmentReschedules = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate appointmentReschedules data
    await appointmentReschedulesValidation.createAppointmentReschedulesValidation(details);

    // Create the appointmentReschedules
    const id = await appointmentReschedulesService.createAppointmentReschedules(details);
    res.status(201).json({ message: "AppointmentReschedules created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all appointmentRescheduless by tenant ID with pagination
 */
exports.getAllAppointmentReschedulessByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const appointmentRescheduless = await appointmentReschedulesService.getAllAppointmentReschedulessByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(appointmentRescheduless);
  } catch (err) {
    next(err);
  }
};
exports.getAllAppointmentReschedulessByTenantIdAndClinicId = async (req, res, next) => {
  const { tenant_id,clinic_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const appointmentRescheduless = await appointmentReschedulesService.getAllAppointmentReschedulessByTenantIdAndClinicId(
      tenant_id,
      clinic_id,
      page,
      limit
    );
    res.status(200).json(appointmentRescheduless);
  } catch (err) {
    next(err);
  }
};

exports.getAllAppointmentReschedulessByTenantIdAndClinicIdAndDentistId = async (req, res, next) => {
  const { tenant_id,clinic_id,dentist_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const appointmentRescheduless = await appointmentReschedulesService.getAllAppointmentReschedulessByTenantIdAndClinicIdAndDentistId(
      tenant_id,
      clinic_id,
      dentist_id,
      page,
      limit
    );
    res.status(200).json(appointmentRescheduless);
  } catch (err) {
    next(err);
  }
};
/**
 * Get appointmentReschedules by tenant and appointmentReschedules ID
 */
exports.getAppointmentReschedulesByTenantIdAndAppointmentReschedulesId = async (req, res, next) => {
  const { appointment_reschedules_id, tenant_id } = req.params;

  try {
    // Validate if appointmentReschedules exists
    const appointmentReschedules1=await checkIfExists(
      "appointment_reschedules",
      "appointment_reschedules_id",
      appointment_reschedules_id,
      tenant_id
    );
    if(!appointmentReschedules1) throw new CustomError('AppointmentReschedules not found',404)

    // Fetch appointmentReschedules details
    const appointmentReschedules = await appointmentReschedulesService.getAppointmentReschedulesByTenantIdAndAppointmentReschedulesId(
      tenant_id,
      appointment_reschedules_id
    );
    res.status(200).json(appointmentReschedules);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing appointmentReschedules
 */
exports.updateAppointmentReschedules = async (req, res, next) => {
  const { appointment_reschedules_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await appointmentReschedulesValidation.updateAppointmentReschedulesValidation(appointment_reschedules_id, details);

    // Update the appointmentReschedules
    await appointmentReschedulesService.updateAppointmentReschedules(appointment_reschedules_id, details, tenant_id);
    res.status(200).json({ message: "AppointmentReschedules updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a appointmentReschedules by ID and tenant ID
 */
exports.deleteAppointmentReschedulesByTenantIdAndAppointmentReschedulesId = async (req, res, next) => {
  const { appointment_reschedules_id, tenant_id } = req.params;

  try {
    // Validate if appointmentReschedules exists
    const treatment = await checkIfExists(
      "appointment_reschedules",
      "appointment_reschedules_id",
      appointment_reschedules_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("AppointmentReschedulesId not Exists", 404);

    // Delete the appointmentReschedules
    await appointmentReschedulesService.deleteAppointmentReschedulesByTenantIdAndAppointmentReschedulesId(
      tenant_id,
      appointment_reschedules_id
    );
    res.status(200).json({ message: "AppointmentReschedules deleted successfully" });
  } catch (err) {
    next(err);
  }
};
