const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");

const notificationColumnConfig = [
    { columnname: "notification_id", type: "int", size: 6, null: false },
    { columnname: "receiver_role", type: "varchar", size: 20, null: false },
    { columnname: "receiver_id", type: "int", size: 11, null: false },
    { columnname: "status", type: "varchar", size: 50, null: true}
];


// NotificationRecipients Column Configuration for Validation
const createColumnConfig = [
  ...notificationColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...notificationColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];
/**
 * Validate Create NotificationRecipients Input with Tenant Scope
 */
const createNotificationRecipientsValidation = async (details) => {
  validateInput(details, createColumnConfig);
  const table=details.receiver_role==='receptionist' ? 'reception' : details.receiver_role

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfIdExists(`${table}`, `${table}_id`, details.sender_id),
  ]);
};

/**
 * Validate Update NotificationRecipients Input with Tenant Scope
 */
const updateNotificationRecipientsValidation = async (notification_recipient_id, details) => {
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "notificationrecipients",
    "notification_recipient_id",
    notification_recipient_id,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("NotificationRecipients not found", 404);
  }
};

module.exports = {
  createNotificationRecipientsValidation,
  updateNotificationRecipientsValidation,
};
