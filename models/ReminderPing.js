const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "reminderping";

// Create ReminderPing
const createReminderPing = async (table,columns, values) => {
  try {
    const reminderping = await record.createRecord(table, columns, values);
    console.log(reminderping)
    return reminderping;
  } catch (error) {
    console.error("Error creating reminderping:", error);
    throw new CustomError("Database Query Error", 500);
  }
};

// Get all reminderpings by tenant ID with pagination
const getAllReminderPingsByTenantId = async (tenantId, limit, offset) => {
  try {
    return await record.getAllRecords("reminderping", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching reminderpings:", error);
    throw new CustomError("Error fetching reminderpings.", 500);
  }
};

// Get reminderping by tenant ID and reminderping ID
const getReminderPingByTenantAndReminderPingId = async (tenant_id, reminderping_id) => {
  try {
    const [rows] = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "reminderping_id",
      reminderping_id
    );
    return rows?.[0] ?? null;
  } catch (error) {
    console.error("Error fetching reminderping:", error);
    throw new CustomError("Error fetching reminderping.", 500);
  }
};

// Update reminderping
const updateReminderPing = async (reminderping_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "reminderping_id"];
    const conditionValue = [tenant_id, reminderping_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating reminderping:", error);
    throw new CustomError("Error updating reminderping.", 500);
  }
};

// Delete reminderping
const deleteReminderPingByTenantAndReminderPingId = async (tenant_id, reminderping_id) => {
  try {
    const conditionColumn = ["tenant_id", "reminderping_id"];
    const conditionValue = [tenant_id, reminderping_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting reminderping:", error);
    throw new CustomError("Error deleting reminderping.", 500);
  }
};



module.exports = {
  createReminderPing,
  getAllReminderPingsByTenantId,
  getReminderPingByTenantAndReminderPingId,
  updateReminderPing,
  deleteReminderPingByTenantAndReminderPingId
};
