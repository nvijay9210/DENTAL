const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const reminderPingService = require("../services/ReminderPingService");
const { isValidDate } = require("../utils/DateUtils");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");
const reminderPingValidation = require("../validations/ReminderPingValidation");

/**
 * Create a new reminderPing
 */
exports.createReminderPing = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate reminderPing data
    await reminderPingValidation.createReminderPingValidation(details);

    // Create the reminderPing
    const id = await reminderPingService.createReminderPing(details);
    res.status(201).json({ message: "ReminderPing created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all reminderPings by tenant ID with pagination
 */
exports.getAllReminderPingsByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const reminderPings = await reminderPingService.getAllReminderPingsByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(reminderPings);
  } catch (err) {
    next(err);
  }
};
exports.getAllReminderPingsByTenantIdAndClinicId = async (req, res, next) => {
  const { tenant_id,clinic_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const reminderPings = await reminderPingService.getAllReminderPingsByTenantIdAndClinicId(
      tenant_id,
      clinic_id,
      page,
      limit
    );
    res.status(200).json(reminderPings);
  } catch (err) {
    next(err);
  }
};

exports.getAllReminderPingsByTenantIdAndClinicIdAndDentistId = async (req, res, next) => {
  const { tenant_id,clinic_id,dentist_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const reminderPings = await reminderPingService.getAllReminderPingsByTenantIdAndClinicIdAndDentistId(
      tenant_id,
      clinic_id,
      dentist_id,
      page,
      limit
    );
    res.status(200).json(reminderPings);
  } catch (err) {
    next(err);
  }
};
/**
 * Get reminderPing by tenant and reminderPing ID
 */
exports.getReminderPingByTenantIdAndReminderPingId = async (req, res, next) => {
  const { reminderPing_id, tenant_id } = req.params;

  try {
    // Validate if reminderPing exists
    const reminderPing1=await checkIfExists(
      "reminderPing",
      "reminderPing_id",
      reminderPing_id,
      tenant_id
    );
    if(!reminderPing1) throw new CustomError('ReminderPing not found',404)

    // Fetch reminderPing details
    const reminderPing = await reminderPingService.getReminderPingByTenantIdAndReminderPingId(
      tenant_id,
      reminderPing_id
    );
    res.status(200).json(reminderPing);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing reminderPing
 */
exports.updateReminderPing = async (req, res, next) => {
  const { reminderPing_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await reminderPingValidation.updateReminderPingValidation(reminderPing_id, details);

    // Update the reminderPing
    await reminderPingService.updateReminderPing(reminderPing_id, details, tenant_id);
    res.status(200).json({ message: "ReminderPing updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a reminderPing by ID and tenant ID
 */
exports.deleteReminderPingByTenantIdAndReminderPingId = async (req, res, next) => {
  const { reminderPing_id, tenant_id } = req.params;

  try {
    // Validate if reminderPing exists
    const treatment = await checkIfExists(
      "reminderPing",
      "reminderPing_id",
      reminderPing_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("ReminderPingId not Exists", 404);

    // Delete the reminderPing
    await reminderPingService.deleteReminderPingByTenantIdAndReminderPingId(
      tenant_id,
      reminderPing_id
    );
    res.status(200).json({ message: "ReminderPing deleted successfully" });
  } catch (err) {
    next(err);
  }
};
