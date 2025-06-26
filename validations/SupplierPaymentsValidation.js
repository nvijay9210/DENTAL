const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");

const supplierPaymentsColumnConfig = [
    { columnname: "tenant_id", type: "int", size: 6, null: false },
    { columnname: "clinic_id", type: "int", size: 11, null: false },
    { columnname: "supplier_id", type: "int", size: 11, null: false },
    { columnname: "amount", type: "decimal", size: "12,2", null: false },
    { columnname: "payment_mode", type: "varchar", size: 50, null: true },
    { columnname: "receipt_number", type: "varchar", size: 100, null: true },
    { columnname: "bank_name", type: "varchar", size: 100, null: true },
    { columnname: "bank_account_number", type: "varchar", size: 100, null: true },
    { columnname: "bank_ifsc", type: "varchar", size: 20, null: true },
    { columnname: "transaction_id", type: "varchar", size: 100, null: true },
    { columnname: "payment_date", type: "date", null: true }
];


// SupplierPayments Column Configuration for Validation
const createColumnConfig = [
  ...supplierPaymentsColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...supplierPaymentsColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];
/**
 * Validate Create SupplierPayments Input with Tenant Scope
 */
const createSupplierPaymentsValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfIdExists("clinic", "clinic_id", details.clinic_id),
    checkIfIdExists("supplier", "supplier_id", details.supplier_id),
  ]);
};

/**
 * Validate Update SupplierPayments Input with Tenant Scope
 */
const updateSupplierPaymentsValidation = async (supplier_payment_id, details) => {
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "supplier_payments",
    "supplier_payment_id",
    supplier_payment_id,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("SupplierPayments not found", 404);
  }
};

module.exports = {
  createSupplierPaymentsValidation,
  updateSupplierPaymentsValidation,
};
