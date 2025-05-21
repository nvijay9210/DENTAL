const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "reminder";

// Create Reminder
const createReminder = async (table,columns, values) => {
  try {
    const reminder = await record.createRecord(table, columns, values);
    console.log(reminder)
    return reminder;
  } catch (error) {
    console.error("Error creating reminder:", error);
    throw new CustomError("Database Query Error", 500);
  }
};

// Get all reminders by tenant ID with pagination
const getAllRemindersByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords("reminder", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    throw new CustomError("Error fetching reminders.", 500);
  }
};

// Get reminder by tenant ID and reminder ID
const getReminderByTenantAndReminderId = async (tenant_id, reminder_id) => {
  try {
    const [rows] = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "reminder_id",
      reminder_id
    );
    return rows?.[0] ?? null;
  } catch (error) {
    console.error("Error fetching reminder:", error);
    throw new CustomError("Error fetching reminder.", 500);
  }
};

// Update reminder
const updateReminder = async (reminder_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "reminder_id"];
    const conditionValue = [tenant_id, reminder_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating reminder:", error);
    throw new CustomError("Error updating reminder.", 500);
  }
};

// Delete reminder
const deleteReminderByTenantAndReminderId = async (tenant_id, reminder_id) => {
  try {
    const conditionColumn = ["tenant_id", "reminder_id"];
    const conditionValue = [tenant_id, reminder_id];

    const [result] = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting reminder:", error);
    throw new CustomError("Error deleting reminder.", 500);
  }
};



module.exports = {
  createReminder,
  getAllRemindersByTenantId,
  getReminderByTenantAndReminderId,
  updateReminder,
  deleteReminderByTenantAndReminderId,
};
