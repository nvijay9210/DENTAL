const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");

const notificationColumnConfig = [
    { columnname: "tenant_id", type: "int", size: 6, null: false },
    { columnname: "sender_role", type: "varchar", size: 20, null: false },
    { columnname: "sender_id", type: "int", size: 11, null: false },
    { columnname: "type", type: "varchar", size: 50, null: false},
    { columnname: "title", type: "varchar", size: 255, null: false},
    { columnname: "message", type: "text", null:false},
    { columnname: "receiver_role", type: "varchar", size: 20, null: false },
    { columnname: "receiver_id", type: "text",null: false },
    { columnname: "status", type: "varchar", size: 50, null: true}
];


// Notification Column Configuration for Validation
const createColumnConfig = [
  ...notificationColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...notificationColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];
/**
 * Validate Create Notification Input with Tenant Scope
 */
const createNotificationValidation = async (details) => {
  validateInput(details, createColumnConfig);
  const table=details.sender_role==='receptionist' ? 'reception' : details.sender_role

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfIdExists(`${table}`, `${table}_id`, details.sender_id),
  ]);
};

/**
 * Validate Update Notification Input with Tenant Scope
 */
const updateNotificationValidation = async (notification_id, details) => {
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "notifications",
    "notification_id",
    notification_id,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("Notification not found", 404);
  }
};

module.exports = {
  createNotificationValidation,
  updateNotificationValidation,
};
