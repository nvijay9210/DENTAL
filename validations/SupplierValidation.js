const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");

const supplierColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 6, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "supplier_name", type: "varchar", size: 100, null: false },
  { columnname: "supplier_category", type: "varchar", size: 100, null: true },
  {
    columnname: "supplier_contact_number",
    type: "varchar",
    size: 15,
    null: true,
  },
  { columnname: "supplier_status", type: "varchar", size: 100, null: true },
  { columnname: "supplier_country", type: "varchar", size: 50, null: true },
  { columnname: "supplier_performance_rating", type: "int", null: true },
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

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfIdExists("clinic", "clinic_id", details.clinic_id),
  ]);
};

/**
 * Validate Update Supplier Input with Tenant Scope
 */
const updateSupplierValidation = async (supplierId, details) => {
  validateInput(details, updateColumnConfig);

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
