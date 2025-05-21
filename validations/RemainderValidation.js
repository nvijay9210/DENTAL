const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");

// Reminder Column Configuration for Validation
const createColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 6, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "dentist_id", type: "int", size: 11, null: false },
  { columnname: "title", type: "varchar", size: 255, null: false },
  { columnname: "description", type: "text", null: true },
  { columnname: "reminder_type", type: "varchar", size: 50, null: true },
  { columnname: "category", type: "varchar", size: 100, null: true },
  { columnname: "due_date", type: "date", null: true },
  { columnname: "due_time", type: "time", null: true },
  { columnname: "reminder_repeat", type: "varchar", size: 20, null: true },
  { columnname: "repeat_interval", type: "int", null: true },
  { columnname: "repeat_weekends", type: "varchar", size: 20, null: true },
  { columnname: "repeat_end_date", type: "date", null: true },
  { columnname: "notify", type: "boolean", null: true },
  { columnname: "notification_tone", type: "varchar", size: 300, null: true },
  { columnname: "status", type: "varchar", size: 20, null: true },
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 6, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "dentist_id", type: "int", size: 11, null: false },
  { columnname: "title", type: "varchar", size: 255, null: false },
  { columnname: "description", type: "text", null: true },
  { columnname: "reminder_type", type: "varchar", size: 50, null: true },
  { columnname: "category", type: "varchar", size: 100, null: true },
  { columnname: "due_date", type: "date", null: true },
  { columnname: "due_time", type: "time", null: true },
  { columnname: "reminder_repeat", type: "varchar", size: 20, null: true },
  { columnname: "repeat_interval", type: "int", null: true },
  { columnname: "repeat_weekends", type: "varchar", size: 20, null: true },
  { columnname: "repeat_end_date", type: "date", null: true },
  { columnname: "notify", type: "boolean", null: true },
  { columnname: "notification_tone", type: "varchar", size: 300, null: true },
  { columnname: "status", type: "varchar", size: 20, null: true },
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];
/**
 * Validate Create Reminder Input with Tenant Scope
 */
const createReminderValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfIdExists("clinic", "clinic_id", details.clinic_id),
    checkIfIdExists("dentist", "dentist_id", details.dentist_id),
  ]);
};

/**
 * Validate Update Reminder Input with Tenant Scope
 */
const updateReminderValidation = async (remainderId, details) => {
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "reminder",
    "reminder_id",
    remainderId,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("Reminder not found", 404);
  }
};

module.exports = {
  createReminderValidation,
  updateReminderValidation,
};
