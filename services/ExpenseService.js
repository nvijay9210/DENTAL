const { CustomError } = require("../middlewares/CustomeError");
const expenseModel = require("../models/ExpenseModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const { formatDateOnly } = require("../utils/DateUtils");

// Field mapping for expenses (similar to treatment)

const expenseFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  expense_date: (val) => val,
  expense_category: (val) => val,
  expense_reason: (val) => val,
  expense_amount: (val) => val,
  mode_of_payment: (val) => val,
  receipt_number: (val) => val,
};
const expenseFieldsReverseMap = {
  expense_id:val=>val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  expense_date: (val) =>
    val ? new Date(val).toISOString().split("T")[0] : null,
  expense_category: (val) => val,
  expense_reason: (val) => val,
  expense_amount: (val) => val,
  mode_of_payment: (val) => val,
  receipt_number: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? new Date(val).toISOString() : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? new Date(val).toISOString() : null),
};

// Create Expense
const createExpense = async (data) => {
  const fieldMap = {
    ...expenseFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const expenseId = await expenseModel.createExpense(
      "expense",
      columns,
      values
    );
    await invalidateCacheByPattern("expense:*");
    return expenseId;
  } catch (error) {
    console.error("Failed to create expense:", error);
    throw new CustomError(`Failed to create expense: ${error.message}`, 404);
  }
};

// Get All Expenses by Tenant ID with Caching
const getAllExpensesByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `expense:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const expenses = await getOrSetCache(cacheKey, async () => {
      const result = await expenseModel.getAllExpensesByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = expenses.map((expense) =>
      helper.convertDbToFrontend(expense, expenseFieldsReverseMap)
    );

    return convertedRows;
  } catch (err) {
    console.error("Database error while fetching expenses:", err);
    throw new CustomError("Failed to fetch expenses", 404);
  }
};

const getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate = async (
  tenantId,
  clinicId,
  startDate,
  endDate
) => {
  const cacheKey = `expense:datewise:${tenantId}`;

  try {
    const expenses = await getOrSetCache(cacheKey, async () => {
      const result =
        await expenseModel.getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate(
          tenantId,
          clinicId,
          startDate,
          endDate
        );
      return result;
    });
    const convertedRows = expenses.map((expense) =>
      helper.convertDbToFrontend(expense, expenseFieldsReverseMap)
    );

    return convertedRows;
  } catch (err) {
    console.error("Database error while fetching expenses:", err);
    throw new CustomError("Failed to fetch expenses", 404);
  }
};

// Get Expense by ID & Tenant
const getExpenseByTenantIdAndExpenseId = async (tenantId, expenseId) => {
  try {
    const expense = await expenseModel.getExpenseByTenantAndExpenseId(
      tenantId,
      expenseId
    );
    const convertedRows = helper.convertDbToFrontend(
      expense,
      expenseFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get expense: " + error.message, 404);
  }
};

// Update Expense
const updateExpense = async (expenseId, data, tenant_id) => {
  const fieldMap = {
    ...expenseFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await expenseModel.updateExpense(
      expenseId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Expense not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("expense:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update expense", 404);
  }
};

// Delete Expense
const deleteExpenseByTenantIdAndExpenseId = async (tenantId, expenseId) => {
  try {
    const affectedRows = await expenseModel.deleteExpenseByTenantAndExpenseId(
      tenantId,
      expenseId
    );
    if (affectedRows === 0) {
      throw new CustomError("Expense not found.", 404);
    }

    await invalidateCacheByPattern("expense:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete expense: ${error.message}`, 404);
  }
};

module.exports = {
  createExpense,
  getAllExpensesByTenantId,
  getExpenseByTenantIdAndExpenseId,
  updateExpense,
  deleteExpenseByTenantIdAndExpenseId,
  getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate,
};
