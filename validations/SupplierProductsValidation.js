const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");

const supplierProductsColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 6, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "supplier_id", type: "int", size: 11, null: false },
  { columnname: "product_name", type: "varchar", size: 255, null: true },
  { columnname: "description", type: "text", null: true },
  { columnname: "unit_price", type: "decimal", size: "15,2", null: true },
  { columnname: "unit", type: "varchar", size: 50, null: true },
  { columnname: "moq", type: "int", null: true },
  { columnname: "lead_time_days", type: "int", null: true },
  { columnname: "currency", type: "varchar", size: 10, null: true },
  { columnname: "active", type: "tinyint", size: 1, null: true, default: 1 }
];


// SupplierProducts Column Configuration for Validation
const createColumnConfig = [
  ...supplierProductsColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...supplierProductsColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];
/**
 * Validate Create SupplierProducts Input with Tenant Scope
 */
const createSupplierProductsValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfIdExists("clinic", "clinic_id", details.clinic_id),
    checkIfIdExists("supplier", "supplier_id", details.supplier_id),
  ]);
};

/**
 * Validate Update SupplierProducts Input with Tenant Scope
 */
const updateSupplierProductsValidation = async (supplier_product_id, details) => {
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "supplier_products",
    "supplier_product_id",
    supplier_product_id,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("SupplierProducts not found", 404);
  }
};

module.exports = {
  createSupplierProductsValidation,
  updateSupplierProductsValidation,
};
