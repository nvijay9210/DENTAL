const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");
const { checkPhoneConflicts } = require("../utils/PhonenumbersValidation");
const { checkEmailConflicts } = require("../utils/EmailValidation");

const superuserColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 6, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "keycloak_id", type: "char", size: 36, null: true },
  { columnname: "username", type: "varchar", size: 100, null: true },
  { columnname: "password", type: "varchar", size: 255, null: true },
  { columnname: "first_name", type: "varchar", size: 100, null: false },
  { columnname: "last_name", type: "varchar", size: 100, null: false },
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
// SuperUser Column Configuration for Validation
const createColumnConfig = [
  ...superuserColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...superuserColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];
/**
 * Validate Create SuperUser Input with Tenant Scope
 */
const createSuperUserValidation = async (details) => {
  validateInput(details, createColumnConfig);

  await checkPhoneConflicts(
    details.phone_number,
    details.alternate_phone_number || null
  );

  await checkEmailConflicts(details.email);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfIdExists("clinic", "clinic_id", details.clinic_id),
  ]);
};

/**
 * Validate Update SuperUser Input with Tenant Scope
 */
const updateSuperUserValidation = async (superuserId, details) => {
  validateInput(details, updateColumnConfig);

  await checkPhoneConflicts(
    details.phone_number,
    details.alternate_phone_number || null,
    "superuser",
    superuserId
  );
  await checkEmailConflicts(details.email, 'superuser', superuserId);

  const exists = await checkIfExists(
    "superuser",
    "superuser_id",
    superuserId,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("SuperUser not found", 404);
  }
};

module.exports = {
  createSuperUserValidation,
  updateSuperUserValidation,
};
