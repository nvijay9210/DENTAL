const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");

const receiptionColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 6, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "keycloak_id", type: "int", size: 11, null: false },
  { columnname: "username", type: "varchar", size: 100, null: false },
  { columnname: "password", type: "varchar", size: 255, null: false },
  { columnname: "full_name", type: "varchar", size: 100, null: false },
  { columnname: "email", type: "varchar", size: 255, null: true },
  {
    columnname: "phone_number",
    type: "varchar",
    size: 15,
    null: false,
  },
  {
    columnname: "alternate_phone_number",
    type: "varchar",
    size: 15,
    null: true,
  },
  { columnname: "date_of_birth", type: "date", null: true },
  { columnname: "address", type: "text", null: true },
  { columnname: "city", type: "varchar", size:100, null: true },
  { columnname: "state", type: "varchar", size:100, null: true },
  { columnname: "country", type: "varchar", size:50, null: true },
  { columnname: "pincode", type: "varchar", size:6, null: true },
  { columnname: "last_login", type: "datetime", null: true }
];
// Receiption Column Configuration for Validation
const createColumnConfig = [
  ...receiptionColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...receiptionColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];
/**
 * Validate Create Receiption Input with Tenant Scope
 */
const createReceiptionValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfIdExists("clinic", "clinic_id", details.clinic_id),
  ]);
};

/**
 * Validate Update Receiption Input with Tenant Scope
 */
const updateReceiptionValidation = async (receiptionId, details) => {
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "receiption",
    "receiption_id",
    receiptionId,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("Receiption not found", 404);
  }
};

module.exports = {
  createReceiptionValidation,
  updateReceiptionValidation,
};
