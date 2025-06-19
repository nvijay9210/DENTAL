const express = require("express");
const router = express.Router();

const expenseController = require("../controllers/ExpenseController");
const {
  ADD_EXPENSE,
  GETALL_EXPENSE_TENANT,
  GET_EXPENSE_TENANT,
  UPDATE_EXPENSE_TENANT,
  DELETE_EXPENSE_TENANT,
  GETALL_EXPENSE_REPORT_TENANT_CLINIC,
} = require("./RouterPath");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");
const expensevalidation = require("../validations/ExpenseValidation");

// Create Expense
router.post(
  ADD_EXPENSE,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist"
  ]),
  expenseController.createExpense
);

// Get All Expenses by Tenant ID with Pagination
router.get(
  GETALL_EXPENSE_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist"
  ]),
  expenseController.getAllExpensesByTenantId
);

router.get(
  GETALL_EXPENSE_REPORT_TENANT_CLINIC,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist"
  ]),
  expenseController.getAllExpensesByTenantIdAndClinicIdAndStartDateAndEndDate
);

// Get Single Expense by Tenant ID & Expense ID
router.get(
  GET_EXPENSE_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist"
  ]),
  expenseController.getExpenseByTenantIdAndExpenseId
);

// Update Expense
router.put(
  UPDATE_EXPENSE_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist"
  ]),
  expenseController.updateExpense
);

// Delete Expense
router.delete(
  DELETE_EXPENSE_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist"
  ]),
  expenseController.deleteExpenseByTenantIdAndExpenseId
);

module.exports = router;
