const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");

const reminderPingColumnConfig = [
    { columnname: "tenant_id", type: "int", size: 6, null: false },
    { columnname: "clinic_id", type: "int", size: 11, null: false },
    { columnname: "dentist_id", type: "int", size: 11, null: false },
    { columnname: "reminder_ping_description", type: "text", null: true },
    { columnname: "reminder_ping_type", type: "varchar", size: 50, null: true },
    { columnname: "reminder_ping_date", type: "date", null: true },
    { columnname: "reminder_ping_time", type: "time", null: true },
  ];

// ReminderPing Column Configuration for Validation
const createColumnConfig = [
  ...reminderPingColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...reminderPingColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

/**
 * Validate Create ReminderPing Input with Tenant Scope
 */
const createReminderPingValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
  ]);
};

/**
 * Validate Update ReminderPing Input with Tenant Scope
 */
const updateReminderPingValidation = async (reminderPingId, details) => {
  await validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "reminderPing",
    "reminderPing_id",
    reminderPingId,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("ReminderPing not found", 404);
  }
};

module.exports = {
  createReminderPingValidation,
  updateReminderPingValidation,
};
