const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");

const paymentColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 6, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "patient_id", type: "int", size: 11, null: false },
  { columnname: "dentist_id", type: "int", size: 11, null: false },
  { columnname: "appointment_id", type: "int", size: 11, null: false },
  {
    columnname: "amount",
    type: "decimal",
    size: "10,2",
    null: false,
    default: 0.0,
  },
  {
    columnname: "discount_applied",
    type: "decimal",
    size: "10,2",
    null: true,
    default: 0.0,
  },
  {
    columnname: "final_amount",
    type: "decimal",
    size: "10,2",
    null: false,
    default: 0.0,
  },
  { columnname: "mode_of_payment", type: "varchar", size: 100, null: false },
  { columnname: "payment_source", type: "varchar", size: 100, null: false },
  { columnname: "payment_reference", type: "varchar", size: 255, null: true },
  {
    columnname: "payment_status",
    type: "varchar",
    size: 100,
    null: false,
    default: "F",
  },
  {
    columnname: "payment_verified",
    type: "tinyint",
    size: 1,
    null: true,
    default: 0,
  },
  { columnname: "receipt_number", type: "varchar", size: 25, null: true },
  {
    columnname: "insurance_number",
    type: "varchar",
    size: 20,
    pattern: "^P\\/\\d{6}\\/\\d{2}\\/\\d{4}\\/\\d{6,8}$",
    null: true,
  },

  { columnname: "payment_date", type: "date", null: true },
];

// Payment Column Configuration for Validation
const createColumnConfig = [
  ...paymentColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...paymentColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

/**
 * Validate Create Payment Input with Tenant Scope
 */
const createPaymentValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
  ]);
};

/**
 * Validate Update Payment Input with Tenant Scope
 */
const updatePaymentValidation = async (paymentId, details) => {
  await validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "payment",
    "payment_id",
    paymentId,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("Payment not found", 404);
  }
};

module.exports = {
  createPaymentValidation,
  updatePaymentValidation,
};
