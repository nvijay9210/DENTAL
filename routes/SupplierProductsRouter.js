const express = require("express");
const router = express.Router();

const supplierController = require("../controllers/SupplierProductsController");
const {
  ADD_SUPPLIER_PRODUCTS,
  GETALL_SUPPLIER_PRODUCTS_TENANT,
  GET_SUPPLIER_PRODUCTS_TENANT,
  UPDATE_SUPPLIER_PRODUCTS_TENANT,
  DELETE_SUPPLIER_PRODUCTS_TENANT,
} = require("./RouterPath");
const suppliervalidation = require("../validations/SupplierProductsValidation");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

// Create SupplierProducts
router.post(
  ADD_SUPPLIER_PRODUCTS,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.createSupplierProducts
);

// Get All SupplierProductss by Tenant ID with Pagination
router.get(
  GETALL_SUPPLIER_PRODUCTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.getAllSupplierProductssByTenantId
);

// Get Single SupplierProducts by Tenant ID & SupplierProducts ID
router.get(
  GET_SUPPLIER_PRODUCTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.getSupplierProductsByTenantIdAndSupplierProductsId
);

// Update SupplierProducts
router.put(
  UPDATE_SUPPLIER_PRODUCTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.updateSupplierProducts
);

// Delete SupplierProducts
router.delete(
  DELETE_SUPPLIER_PRODUCTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.deleteSupplierProductsByTenantIdAndSupplierProductsId
);

module.exports = router;
