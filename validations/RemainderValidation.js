const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");

const reminderColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 6, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "dentist_id", type: "int", size: 11, null: false },
  { columnname: "title", type: "varchar", size: 255, null: false },
  { columnname: "description", type: "text", null: true },
  { columnname: "category", type: "varchar", size: 100, null: true },
  { columnname: "start_date", type: "date", null: false },
  { columnname: "time", type: "time", null: false },
  { columnname: "reminder_repeat", type: "varchar", null: true },
  { columnname: "reminder_type", type: "varchar", null: true },
  { columnname: "type", type: "varchar", null: false },
  { columnname: "repeat_interval", type: "int", null: false },
  { columnname: "repeat_count", type: "int", null: true },
  { columnname: "notify_before_hours", type: "int", null: true },
  { columnname: "repeat_weekends", type: "varchar", size: 20, null: true },
  { columnname: "monthly_week", type: "text", null: true },
  { columnname: "monthly_weekends", type: "text", null: true },
  { columnname: "monthly_option", type: "varchar", size: 20, null: true },
  { columnname: "repeat_end_date", type: "date", null: true },
  { columnname: "notify", type: "boolean", null: true },
  { columnname: "is_recurring", type: "boolean", null: true },
  { columnname: "reminder_reason", type: "varchar", size: 255, null: true },
  { columnname: "status", type: "varchar", size: 20, null: true },
];
// Reminder Column Configuration for Validation
const createColumnConfig = [
  ...reminderColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...reminderColumnConfig,
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

  if(isNaN(details.repeat_interval) || details.repeat_interval==0) throw new CustomError('Repeat interval must greater than 0')
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

const getMonthlyWiseReminderValidation=async(month,year)=>{
  if (!month || !year) throw new CustomError('Month and Year are required', 400);
      if (isNaN(month) || isNaN(year)) throw new CustomError('Month and Year must be numbers', 400);
  
      const monthInt = parseInt(month, 10);
      const yearInt = parseInt(year, 10);
  
      if (monthInt < 1 || monthInt > 12) throw new CustomError('Month must be between 1 and 12', 400);
}

module.exports = {
  createReminderValidation,
  updateReminderValidation,
  getMonthlyWiseReminderValidation
};
