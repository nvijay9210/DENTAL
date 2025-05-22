const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const expenseService = require("../services/ExpenseService");
const { isValidDate } = require("../utils/DateUtils");
const expenseValidation = require("../validations/ExpenseValidation");

/**
 * Create a new expense
 */
exports.createExpense = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate expense data
    await expenseValidation.createExpenseValidation(details);

    // Create the expense
    const id = await expenseService.createExpense(details);
    res.status(201).json({ message: "Expense created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all expenses by tenant ID with pagination
 */
exports.getAllExpensesByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  try {
    const expenses = await expenseService.getAllExpensesByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(expenses);
  } catch (err) {
    next(err);
  }
};

exports.getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate = async (
  req,
  res,
  next
) => {
  const { tenant_id, clinic_id } = req.params;
  const {start_date, end_date } = req.query;
  try {
    if (!(isValidDate(start_date) && isValidDate(end_date)))
      throw new CustomError("Startdate or enddate format invalid", 400);
    const expenses =
      await expenseService.getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate(
        tenant_id,
        clinic_id,
        start_date,
        end_date
      );
    res.status(200).json(expenses);
  } catch (err) {
    next(err);
  }
};

/**
 * Get expense by tenant and expense ID
 */
exports.getExpenseByTenantIdAndExpenseId = async (req, res, next) => {
  const { expense_id, tenant_id } = req.params;

  try {
    // Validate if expense exists
    await expenseValidation.checkExpenseExistsByIdValidation(
      tenant_id,
      expense_id
    );

    // Fetch expense details
    const expense = await expenseService.getExpenseByTenantIdAndExpenseId(
      tenant_id,
      expense_id
    );
    res.status(200).json(expense);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing expense
 */
exports.updateExpense = async (req, res, next) => {
  const { expense_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await expenseValidation.updateExpenseValidation(expense_id, details);

    // Update the expense
    await expenseService.updateExpense(expense_id, details, tenant_id);
    res.status(200).json({ message: "Expense updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a expense by ID and tenant ID
 */
exports.deleteExpenseByTenantIdAndExpenseId = async (req, res, next) => {
  const { expense_id, tenant_id } = req.params;

  try {
    // Validate if expense exists
    const treatment = await checkIfExists(
      "expense",
      "expense_id",
      expense_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("expenseId not Exists", 404);

    // Delete the expense
    await expenseService.deleteExpenseByTenantIdAndExpenseId(
      tenant_id,
      expense_id
    );
    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (err) {
    next(err);
  }
};
