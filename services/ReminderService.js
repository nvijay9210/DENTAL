const { CustomError } = require("../middlewares/CustomeError");
const reminderModel = require("../models/ReminderModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const { formatDateOnly } = require("../utils/DateUtils");

// Field mapping for reminders (similar to treatment)
const reminderFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  dentist_id: (val) => val,
  title: (val) => val,
  description: helper.safeStringify,
  reminder_reason: (val) => val,
  reminder_type: (val) => val,
  category: (val) => val,
  due_date: (val) => val,
  due_time: (val) => val,
  reminder_repeat: (val) => val,
  repeat_interval: (val) => val,
  repeat_weekdays: (val) => val,
  repeat_end_date: (val) => val,
  notify: helper.parseBoolean,
  notification_tone: (val) => val,
  status: (val) => val,
};

const reminderFieldsReverseMap = {
  reminder_id: (val) => val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  dentist_id: (val) => val,
  title: (val) => val,
  description: helper.safeJsonParse,
  reminder_reason: (val) => val,
  reminder_type: (val) => val,
  category: (val) => val,
  due_date: (val) => val,
  due_time: (val) => val,
  reminder_repeat: (val) => val,
  repeat_interval: (val) => val,
  repeat_weekdays: (val) => val,
  repeat_end_date: (val) => val,
  notify: (val) => Boolean(val),
  notification_tone: (val) => val,
  status: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? new Date(val).toISOString() : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? new Date(val).toISOString() : null),
};
// Create Reminder
const createReminder = async (data) => {
  const fieldMap = {
    ...reminderFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const reminderId = await reminderModel.createReminder(
      "reminder",
      columns,
      values
    );
    await invalidateCacheByPattern("reminder:*");
    return reminderId;
  } catch (error) {
    console.error("Failed to create reminder:", error);
    throw new CustomError(`Failed to create reminder: ${error.message}`, 404);
  }
};

// Get All Reminders by Tenant ID with Caching
const getAllRemindersByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `reminder:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const reminders = await getOrSetCache(cacheKey, async () => {
      const result = await reminderModel.getAllRemindersByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = reminders.map((reminder) =>
      helper.convertDbToFrontend(reminder, reminderFieldsReverseMap)
    );

    return convertedRows;
  } catch (err) {
    console.error("Database error while fetching reminders:", err);
    throw new CustomError("Failed to fetch reminders", 404);
  }
};

// Get Reminder by ID & Tenant
const getReminderByTenantIdAndReminderId = async (tenantId, reminderId) => {
  try {
    const reminder = await reminderModel.getReminderByTenantAndReminderId(
      tenantId,
      reminderId
    );
    
    const convertedRows = 
      helper.convertDbToFrontend(reminder, reminderFieldsReverseMap)
  

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get reminder: " + error.message, 404);
  }
};

// Update Reminder
const updateReminder = async (reminderId, data, tenant_id) => {
  const fieldMap = {
    ...reminderFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await reminderModel.updateReminder(
      reminderId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Reminder not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("reminder:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update reminder", 404);
  }
};

// Delete Reminder
const deleteReminderByTenantIdAndReminderId = async (tenantId, reminderId) => {
  try {
    const affectedRows =
      await reminderModel.deleteReminderByTenantAndReminderId(
        tenantId,
        reminderId
      );
    if (affectedRows === 0) {
      throw new CustomError("Reminder not found.", 404);
    }

    await invalidateCacheByPattern("reminder:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete reminder: ${error.message}`, 404);
  }
};

module.exports = {
  createReminder,
  getAllRemindersByTenantId,
  getReminderByTenantIdAndReminderId,
  updateReminder,
  deleteReminderByTenantIdAndReminderId,
};
