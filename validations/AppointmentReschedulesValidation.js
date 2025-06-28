const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { checkPreviousDatetimeOrNot } = require("../utils/DateUtils");

const reminderPingColumnConfig = [
    { columnname: "tenant_id", type: "int", size: 6, null: false },
    { columnname: "clinic_id", type: "int", size: 11, null: false },
    { columnname: "dentist_id", type: "int", size: 11, null: false },
    { columnname: "original_appointment_id", type: "int", size: 11, null: false },
    { columnname: "new_appointment_id", type: "int", size: 11, null: true },
    { columnname: "reason", type: "text", null: false },
    { columnname: "previous_date", type: "date", null: true },
    { columnname: "new_date", type: "date", null: false },
    { columnname: "previous_time", type: "time", null: true },
    { columnname: "new_start_time", type: "time", null: false },
    { columnname: "new_end_time", type: "time", null: false },
    { columnname: "rescheduled_by", type: "varchar", size: 30, null: false },
    { columnname: "rescheduled_at", type: "datetime", size: 30, null: true },
    { columnname: "charges_applicable", type: "boolean", null: true },
    { columnname: "charges_amount", type: "decimal", null: true },
  ];

// AppointmentReschedules Column Configuration for Validation
const createColumnConfig = [
  ...reminderPingColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...reminderPingColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

/**
 * Validate Create AppointmentReschedules Input with Tenant Scope
 */
const createAppointmentReschedulesValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
  ]);
  if(!checkPreviousDatetimeOrNot(details.new_date,details.new_start_time)){
    throw new CustomError("AppointmentReschedule DateTime Expired",400);
  }

  await checkIfIdExists(
    "appointment",
    "appointment_id",
    details.original_appointment_id
  );
};

/**
 * Validate Update AppointmentReschedules Input with Tenant Scope
 */
const updateAppointmentReschedulesValidation = async (rescheduled_id, details) => {
  await validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "appointment_reschedules",
    "rescheduled_id",
    rescheduled_id,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("AppointmentReschedules not found", 404);
  }
};

module.exports = {
  createAppointmentReschedulesValidation,
  updateAppointmentReschedulesValidation,
};
