const { checkIfExists } = require("../models/checkIfExists");
const reminderService = require("../services/ReminderService");
const reminderValidation = require("../validations/RemainderValidation");

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
    const reminders = await reminderService.getAllRemindersByTenantId(tenant_id, page, limit);
    res.status(200).json(reminders);
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
    // Validate if reminder exists
    await reminderValidation.checkReminderExistsByIdValidation(tenant_id, reminder_id);

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

/**
 * Update an existing reminder
 */
exports.updateReminder = async (req, res, next) => {
  const { reminder_id,tenant_id } = req.params;
  const details = req.body;

  try {
  
    // Validate update input
    await reminderValidation.updateReminderValidation(reminder_id, details);

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
    const treatment=await checkIfExists('reminder','reminder_id',reminder_id,tenant_id);
    if(!treatment) throw new CustomError('reminderId not Exists',404)

    // Delete the reminder
    await reminderService.deleteReminderByTenantIdAndReminderId(tenant_id, reminder_id);
    res.status(200).json({ message: "Reminder deleted successfully" });
  } catch (err) {
    next(err);
  }
};