const express = require("express");
const router = express.Router();

const expenseController = require("../controllers/ExpenseController");
const {
  ADD_EXPENSE,
  GETALL_EXPENSE_TENANT,
  GET_EXPENSE_TENANT,
  UPDATE_EXPENSE_TENANT,
  DELETE__TENANT,
} = require("./RouterPath");
const expensevalidation = require("../validations/ExpenseValidation");

// Create Expense
router.post(
  ADD_EXPENSE,
  expenseController.createExpense
);

// Get All Expenses by Tenant ID with Pagination
router.get(GETALL_EXPENSE_TENANT, expenseController.getAllExpensesByTenantId);

// Get Single Expense by Tenant ID & Expense ID
router.get(GET_EXPENSE_TENANT, expenseController.getExpenseByTenantIdAndExpenseId);

// Update Expense
router.put(
  UPDATE_EXPENSE_TENANT,
  expenseController.updateExpense
);

// Delete Expense
router.delete(
  DELETE_EXPENSE_TENANT,
  expenseController.deleteExpenseByTenantIdAndExpenseId
);

module.exports = router;
