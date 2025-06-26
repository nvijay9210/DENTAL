const express = require("express");
const router = express.Router();

const supplierPaymentController = require("../controllers/SupplierPaymentController");
const {
  ADD_SUPPLIER_PAYMENTS,
  GETALL_SUPPLIER_PAYMENTS_TENANT,
  GET_SUPPLIER_PAYMENTS_TENANT,
  UPDATE_SUPPLIER_PAYMENTS_TENANT,
  DELETE_SUPPLIER_PAYMENTS_TENANT,
} = require("./RouterPath");
const suppliervalidation = require("../validations/SupplierPaymentsValidation");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

// Create SupplierPayments
router.post(
  ADD_SUPPLIER_PAYMENTS,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierPaymentController.createSupplierPayments
);

// Get All SupplierPaymentss by Tenant ID with Pagination
router.get(
  GETALL_SUPPLIER_PAYMENTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierPaymentController.getAllSupplierPaymentssByTenantId
);

// Get Single SupplierPayments by Tenant ID & SupplierPayments ID
router.get(
  GET_SUPPLIER_PAYMENTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierPaymentController.getSupplierPaymentsByTenantIdAndSupplierPaymentsId
);

// Update SupplierPayments
router.put(
  UPDATE_SUPPLIER_PAYMENTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierPaymentController.updateSupplierPayments
);

// Delete SupplierPayments
router.delete(
  DELETE_SUPPLIER_PAYMENTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierPaymentController.deleteSupplierPaymentsByTenantIdAndSupplierPaymentsId
);

module.exports = router;
