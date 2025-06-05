const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");

const expenseColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 6, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "expense_amount", type: "decimal", null: false },
  { columnname: "expense_category", type: "varchar", size: 255, null: true },
  { columnname: "expense_reason", type: "varchar", size: 255, null: true },
  { columnname: "expense_date", type: "date", size: 255, null: true },
  { columnname: "mode_of_payment", type: "varchar", size: 255, null: true },
  { columnname: "receipt_number", type: "varchar", size: 100, null: true },
];
// Expense Column Configuration for Validation
const createColumnConfig = [
  ...expenseColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...expenseColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];

/**
 * Validate Create Expense Input with Tenant Scope
 */
const createExpenseValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
  ]);
};

/**
 * Validate Update Expense Input with Tenant Scope
 */
const updateExpenseValidation = async (expenseId, details) => {
  await validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "expense",
    "expense_id",
    expenseId,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("Expense not found", 404);
  }
};

module.exports = {
  createExpenseValidation,
  updateExpenseValidation,
};
