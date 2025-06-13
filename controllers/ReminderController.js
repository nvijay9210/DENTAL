const { checkIfExists, checkIfIdExists } = require("../models/checkIfExists");
const reminderService = require("../services/ReminderService");

const reminderValidation = require("../validations/RemainderValidation");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");
const { CustomError } = require("../middlewares/CustomeError");

/**
 * Create a new reminder
 */
exports.createReminder = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate reminder data
    await reminderValidation.createReminderValidation(details);

    // Create the reminder
    const id = await reminderService.createReminder(details);
    res.status(201).json({ message: "Reminder created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all reminders by tenant ID with pagination
 */
exports.getAllRemindersByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  try {
    await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
    const reminders = await reminderService.getAllRemindersByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json({ reminders, total: reminders.length, page });
  } catch (err) {
    next(err);
  }
};

/**
 * Get reminder by tenant and reminder ID
 */
exports.getReminderByTenantIdAndReminderId = async (req, res, next) => {
  const { reminder_id, tenant_id } = req.params;

  try {
    // const reminder1 = await checkIfExists(
    //   "reminder",
    //   "reminder_id",
    //   reminder_id,
    //   tenant_id
    // );

    // if (!reminder1) throw new CustomError("Reminder not found", 404);

    const resp1=await checkIfIdExists("tenant", "tenant_id", tenant_id);
    if(!resp1) throw new CustomError('Tenant not found',404)
    const resp2=await checkIfIdExists("reminder", "reminder_id", reminder_id);
    if(!resp2) throw new CustomError('Reminder not found',404)
    // Fetch reminder details
    const reminder = await reminderService.getReminderByTenantIdAndReminderId(
      tenant_id,
      reminder_id
    );
    res.status(200).json(reminder);
  } catch (err) {
    next(err);
  }
};
exports.getReminderByTenantAndClinicIdAndDentistIdAndReminderId = async (
  req,
  res,
  next
) => {
  const { reminder_id, tenant_id, clinic_id, dentist_id } = req.params;

  try {
    const reminder1 = await checkIfExists(
      "reminder",
      "reminder_id",
      reminder_id,
      tenant_id
    );

    if (!reminder1) throw new CustomError("Reminder not found", 404);

    await checkIfIdExists("clinic", "clinic_id", clinic_id);
    await checkIfIdExists("dentist", "dentist_id", dentist_id);

    // Fetch reminder details
    const reminder =
      await reminderService.getReminderByTenantAndClinicIdAndDentistIdAndReminderId(
        tenant_id,
        clinic_id,
        dentist_id,
        reminder_id
      );
    res.status(200).json(reminder);
  } catch (err) {
    next(err);
  }
};

exports.getAllRemindersByTenantAndClinicAndDentistAndType = async (
  req,
  res,
  next
) => {
  const { tenant_id, clinic_id, dentist_id } = req.params;
  const { type, page, limit } = req.query;
  if (type !== "reminder" && type !== "todo")
    throw new CustomError("Type must in reminder or todo only", 400);

  try {
    await checkIfIdExists("clinic", "clinic_id", clinic_id);
    await checkIfIdExists("tenant", "tenant_id", tenant_id);
    await checkIfIdExists("dentist", "dentist_id", dentist_id);

    // Fetch reminder details
    const reminder =
      await reminderService.getAllRemindersByTenantAndClinicAndDentistAndType(
        tenant_id,
        clinic_id,
        dentist_id,
        page,
        limit,
        type
      );
    res.status(200).json(reminder);
  } catch (err) {
    next(err);
  }
};

exports.getAllNotifyByDentist = async (
  req,
  res,
  next
) => {
  const { tenant_id, clinic_id, dentist_id } = req.params;
 
  try {
    await checkIfIdExists("clinic", "clinic_id", clinic_id);
    await checkIfIdExists("tenant", "tenant_id", tenant_id);
    await checkIfIdExists("dentist", "dentist_id", dentist_id);

    // Fetch reminder details
    const reminder =
      await reminderService.getAllNotifyByDentist(
        tenant_id,
        clinic_id,
        dentist_id
      );
    res.status(200).json(reminder);
  } catch (err) {
    next(err);
  }
};

exports.getAllNotifyByPatient = async (
  req,
  res,
  next
) => {
  const { tenant_id, clinic_id, patient_id } = req.params;
 
  try {
    await checkIfIdExists("clinic", "clinic_id", clinic_id);
    await checkIfIdExists("tenant", "tenant_id", tenant_id);
    await checkIfIdExists("patient", "patient_id", patient_id);

    // Fetch reminder details
    const reminder =
      await reminderService.getAllNotifyByPatient(
        tenant_id,
        clinic_id,
        patient_id
      );
    res.status(200).json(reminder);
  } catch (err) {
    next(err);
  }
};

exports.getMonthlywiseRemindersByTenantAndClinicIdAndDentistId = async (
  req,
  res,
  next
) => {
  const { tenant_id, clinic_id, dentist_id } = req.params;
  const { month, year } = req.query;

  try {
    await reminderValidation.getMonthlyWiseReminderValidation(month, year);
    const monthInt = parseInt(month, 10);
    const yearInt = parseInt(year, 10);
    // Validation checks
    await checkIfIdExists("tenant", "tenant_id", tenant_id);
    await checkIfIdExists("clinic", "clinic_id", clinic_id);
    await checkIfIdExists("dentist", "dentist_id", dentist_id);

    // Fetch monthly reminders
    const reminders =
      await reminderService.getMonthlywiseRemindersByTenantAndClinicIdAndDentistId(
        tenant_id,
        clinic_id,
        dentist_id,
        monthInt,
        yearInt
      );

    res.status(200).json(reminders);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing reminder
 */
exports.updateReminder = async (req, res, next) => {
  const { reminder_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await reminderValidation.updateReminderValidation(reminder_id, details);

    if (isNaN(details.repeat_interval) || details.repeat_interval == 0)
      throw new CustomError("Repeat interval must greater than 0");

    // Update the reminder
    await reminderService.updateReminder(reminder_id, details, tenant_id);
    res.status(200).json({ message: "Reminder updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a reminder by ID and tenant ID
 */
exports.deleteReminderByTenantIdAndReminderId = async (req, res, next) => {
  const { reminder_id, tenant_id } = req.params;

  try {
    // Validate if reminder exists
    const reminder1 = await checkIfExists(
      "reminder",
      "reminder_id",
      reminder_id,
      tenant_id
    );

    if (!reminder1) throw new CustomError("Reminder not found", 404);

    // Delete the reminder
    await reminderService.deleteReminderByTenantIdAndReminderId(
      tenant_id,
      reminder_id
    );
    res.status(200).json({ message: "Reminder deleted successfully" });
  } catch (err) {
    next(err);
  }
};
