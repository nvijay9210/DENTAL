const express = require("express");
const router = express.Router();

const expenseController = require("../controllers/ExpenseController");
const {
  ADD_ASSET,
  GETALL_ASSET_TENANT,
  GET_ASSET_TENANT,
  UPDATE_ASSET_TENANT,
  DELETE_ASSET_TENANT,
} = require("./RouterPath");
const expensevalidation = require("../validations/ExpenseValidation");

// Create Expense
router.post(
  ADD_ASSET,
  expenseController.createExpense
);

// Get All Expenses by Tenant ID with Pagination
router.get(GETALL_ASSET_TENANT, expenseController.getAllExpensesByTenantId);

// Get Single Expense by Tenant ID & Expense ID
router.get(GET_ASSET_TENANT, expenseController.getExpenseByTenantIdAndExpenseId);

// Update Expense
router.put(
  UPDATE_ASSET_TENANT,
  expenseController.updateExpense
);

// Delete Expense
router.delete(
  DELETE_ASSET_TENANT,
  expenseController.deleteExpenseByTenantIdAndExpenseId
);

module.exports = router;
