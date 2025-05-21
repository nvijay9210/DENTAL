const express = require("express");
const router = express.Router();

const supplierController = require("../controllers/SupplierController");
const {
  ADD_EXPENSE,
  GETALL_EXPENSE_TENANT,
  GET_EXPENSE_TENANT,
  UPDATE_EXPENSE_TENANT,
  DELETE_EXPENSE_TENANT,
} = require("./RouterPath");
const suppliervalidation = require("../validations/SupplierValidation");

// Create Supplier
router.post(
  ADD_EXPENSE,
  supplierController.createSupplier
);

// Get All Suppliers by Tenant ID with Pagination
router.get(GETALL_EXPENSE_TENANT, supplierController.getAllSuppliersByTenantId);

// Get Single Supplier by Tenant ID & Supplier ID
router.get(GET_EXPENSE_TENANT, supplierController.getSupplierByTenantIdAndSupplierId);

// Update Supplier
router.put(
  UPDATE_EXPENSE_TENANT,
  supplierController.updateSupplier
);

// Delete Supplier
router.delete(
  DELETE_EXPENSE_TENANT,
  supplierController.deleteSupplierByTenantIdAndSupplierId
);

module.exports = router;
