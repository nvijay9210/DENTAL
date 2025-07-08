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

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");
const { buildCacheKey } = require("../utils/RedisCache");

// Field mapping for expenses (similar to treatment)

const expenseFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  expense_date: (val) => val,
  expense_category: (val) => val,
  expense_reason: (val) => val,
  expense_amount: (val) => val? parseFloat(val) : 0,
  mode_of_payment: (val) => val,
  receipt_number: (val) => val,
  paid_by: (val) => val,
  paid_by_user: (val) => val,
  paid_to: (val) => val,
  expense_documents: helper.safeStringify,
};
const expenseFieldsReverseMap = {
  expense_id:val=>val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  expense_date: (val) =>
    val ? formatDateOnly(val) : null,
  expense_category: (val) => val,
  expense_reason: (val) => val,
  expense_amount: (val) => val? parseFloat(val) : 0,
  mode_of_payment: (val) => val,
  receipt_number: (val) => val,
  paid_by: (val) => val,
  paid_by_user: (val) => val,
  paid_to: (val) => val,
  expense_documents: helper.safeJsonParse,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
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
    await invalidateCacheByPattern("financeSummary:*");
    return expenseId;
  } catch (error) {
    console.error("Failed to create expense:", error);
    throw new CustomError(`Failed to create expense: ${error.message}`, 404);
  }
};

// Get All Expenses by Tenant ID with Caching
const getAllExpensesByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("expense", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });
  try {
    const expenses = await getOrSetCache(cacheKey, async () => {
      const result = await expenseModel.getAllExpensesByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = expenses.data.map((expense) =>
      helper.convertDbToFrontend(expense, expenseFieldsReverseMap)
    );

    return {data:convertedRows,total:expenses.total};;
  } catch (err) {
    console.error("Database error while fetching expenses:", err);
    throw new CustomError("Failed to fetch expenses", 404);
  }
};

const getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate = async (
  tenantId,
  clinicId,
  startDate,
  endDate,
  page=1,
  limit=10,
) => {
  const cacheKey = buildCacheKey("expense", "list", {
    tenant_id: tenantId,
    clinic_id:clinicId,
    startDate,
    endDate,
    page,
    limit,
  });
  const offset = (page - 1) * limit;
  try {
    const expenses = await getOrSetCache(cacheKey, async () => {
      const result =
        await expenseModel.getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate(
          tenantId,
          clinicId,
          startDate,
          endDate,
          parseInt(limit),
          parseInt(offset)
        );
      return result;
    });
    const convertedRows = expenses.data.map((expense) =>
      helper.convertDbToFrontend(expense, expenseFieldsReverseMap)
    );

    return {data:convertedRows,total:expenses.total};;
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
    await invalidateCacheByPattern("financeSummary:*");
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
    await invalidateCacheByPattern("financeSummary:*");
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
