const express = require("express");
const router = express.Router();

const supplierController = require("../controllers/PurchaseOrdersController");
const {
  ADD_PURCHASE_ORDER,
  GETALL_PURCHASE_ORDER_TENANT,
  GET_PURCHASE_ORDER_TENANT,
  UPDATE_PURCHASE_ORDER_TENANT,
  DELETE_PURCHASE_ORDER_TENANT,
  GETALL_PURCHASE_ORDER_TENANT_SUPPLIER,
  GETALL_PURCHASE_ORDER_TENANT_CLINIC,
} = require("./RouterPath");
const suppliervalidation = require("../validations/PurchaseOrderValidation");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

// Create PurchaseOrder
router.post(
  ADD_PURCHASE_ORDER,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.createPurchaseOrder
);

// Get All PurchaseOrders by Tenant ID with Pagination
router.get(
  GETALL_PURCHASE_ORDER_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.getAllPurchaseOrdersByTenantId
);
router.get(
  GETALL_PURCHASE_ORDER_TENANT_SUPPLIER,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.getAllPurchaseOrdersByTenantIdAndSupplierId
);
router.get(
  GETALL_PURCHASE_ORDER_TENANT_CLINIC,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "clinic",
  ]),
  supplierController.getAllPurchaseOrdersByTenantIdAndClinicId
);

// Get Single PurchaseOrder by Tenant ID & PurchaseOrder ID
router.get(
  GET_PURCHASE_ORDER_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.getPurchaseOrderByTenantIdAndPurchaseOrderId
);

// Update PurchaseOrder
router.put(
  UPDATE_PURCHASE_ORDER_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.updatePurchaseOrder
);

// Delete PurchaseOrder
router.delete(
  DELETE_PURCHASE_ORDER_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.deletePurchaseOrderByTenantIdAndPurchaseOrderId
);

module.exports = router;
