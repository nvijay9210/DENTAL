const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");

const receptionColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 6, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "keycloak_id", type: "char", size: 36, null: true },
  { columnname: "username", type: "varchar", size: 100, null: true },
  { columnname: "password", type: "varchar", size: 255, null: true },
  { columnname: "full_name", type: "varchar", size: 100, null: false },
  { columnname: "email", type: "varchar", size: 255, null: true },
  {
    columnname: "phone_number",
    type: "varchar",
    size: 20,
    null: false,
  },
  {
    columnname: "alternate_phone_number",
    type: "varchar",
    size: 20,
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
// Reception Column Configuration for Validation
const createColumnConfig = [
  ...receptionColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...receptionColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];
/**
 * Validate Create Reception Input with Tenant Scope
 */
const createReceptionValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfIdExists("clinic", "clinic_id", details.clinic_id),
  ]);
};

/**
 * Validate Update Reception Input with Tenant Scope
 */
const updateReceptionValidation = async (receptionId, details) => {
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "reception",
    "reception_id",
    receptionId,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("Reception not found", 404);
  }
};

module.exports = {
  createReceptionValidation,
  updateReceptionValidation,
};
