const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");
const { checkPhoneConflicts } = require("../utils/PhonenumbersValidation");
const { checkEmailConflicts } = require("../utils/EmailValidation");

const supplierColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 6, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  {
    columnname: "supplier_code",
    type: "varchar",
    size: 50,
    null: true,
    unique: true,
  },
  { columnname: "keycloak_id", type: "char", size: 36, null: true },
  { columnname: "username", type: "varchar", size: 50, null: true },
  { columnname: "password", type: "varchar", size: 255, null: true },
  { columnname: "name", type: "varchar", size: 100, null: true },
  { columnname: "category", type: "varchar", size: 100, null: true },
  { columnname: "status", type: "tinyint", size: 1, null: true, default: 0 },
  { columnname: "email", type: "varchar", size: 150, null: true },
  { columnname: "phone_number", type: "varchar", size: 20, null: false },
  {
    columnname: "alternate_phone_number",
    type: "varchar",
    size: 20,
    null: false,
  },
  { columnname: "fax", type: "varchar", size: 50, null: true },
  { columnname: "website", type: "varchar", size: 255, null: true },
  { columnname: "gst_number", type: "varchar", size: 50, null: true },
  { columnname: "tax_id", type: "varchar", size: 50, null: true },
  { columnname: "pan_number", type: "varchar", size: 50, null: true },
  { columnname: "logo_url", type: "text", null: true },
  { columnname: "mode_of_payment", type: "varchar", size: 100, null: true },
  { columnname: "preferred_currency", type: "varchar", size: 10, null: true },
  { columnname: "credit_limit", type: "decimal", size: "15,2", null: true },
  { columnname: "opening_balance", type: "decimal", size: "15,2", null: true },
  { columnname: "notes", type: "text", null: true },
];

// Supplier Column Configuration for Validation
const createColumnConfig = [
  ...supplierColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...supplierColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];
/**
 * Validate Create Supplier Input with Tenant Scope
 */
const createSupplierValidation = async (details) => {
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
  console.log("createsuplliervalidation done");
};

/**
 * Validate Update Supplier Input with Tenant Scope
 */
const updateSupplierValidation = async (supplierId, details) => {
  validateInput(details, updateColumnConfig);

  await checkPhoneConflicts(
    details.phone_number,
    details.alternate_phone_number || null,
    "supplier",
    supplierId
  );
  await checkEmailConflicts(details.email,"supplier",supplierId);



  const exists = await checkIfExists(
    "supplier",
    "supplier_id",
    supplierId,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("Supplier not found", 404);
  }
};

module.exports = {
  createSupplierValidation,
  updateSupplierValidation,
};
