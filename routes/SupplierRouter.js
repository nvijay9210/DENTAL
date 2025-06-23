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
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

// Create Supplier
router.post(
  ADD_SUPPLIER,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.createSupplier
);

// Get All Suppliers by Tenant ID with Pagination
router.get(
  GETALL_SUPPLIER_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.getAllSuppliersByTenantId
);

// Get Single Supplier by Tenant ID & Supplier ID
router.get(
  GET_SUPPLIER_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.getSupplierByTenantIdAndSupplierId
);

// Update Supplier
router.put(
  UPDATE_SUPPLIER_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.updateSupplier
);

// Delete Supplier
router.delete(
  DELETE_SUPPLIER_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.deleteSupplierByTenantIdAndSupplierId
);

module.exports = router;
