const express = require("express");
const router = express.Router();

const supplierController = require("../controllers/SupplierController");
const {
  ADD_SUPPLIER,
  GETALL_SUPPLIER_TENANT,
  GET_SUPPLIER_TENANT,
  UPDATE_SUPPLIER_TENANT,
  DELETE_SUPPLIER_TENANT,
} = require("./RouterPath");
const suppliervalidation = require("../validations/SupplierValidation");

// Create Supplier
router.post(
  ADD_SUPPLIER,
  supplierController.createSupplier
);

// Get All Suppliers by Tenant ID with Pagination
router.get(GETALL_SUPPLIER_TENANT, supplierController.getAllSuppliersByTenantId);

// Get Single Supplier by Tenant ID & Supplier ID
router.get(GET_SUPPLIER_TENANT, supplierController.getSupplierByTenantIdAndSupplierId);

// Update Supplier
router.put(
  UPDATE_SUPPLIER_TENANT,
  supplierController.updateSupplier
);

// Delete Supplier
router.delete(
  DELETE_SUPPLIER_TENANT,
  supplierController.deleteSupplierByTenantIdAndSupplierId
);

module.exports = router;
