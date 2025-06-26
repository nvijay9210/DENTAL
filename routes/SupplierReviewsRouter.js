const express = require("express");
const router = express.Router();

const supplierController = require("../controllers/SupplierReviewsController");
const {
  ADD_SUPPLIER_REVIEWS,
  GETALL_SUPPLIER_REVIEWS_TENANT,
  GET_SUPPLIER_REVIEWS_TENANT,
  UPDATE_SUPPLIER_REVIEWS_TENANT,
  DELETE_SUPPLIER_REVIEWS_TENANT,
} = require("./RouterPath");
const suppliervalidation = require("../validations/SupplierReviewsValidation");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

// Create SupplierReviews
router.post(
  ADD_SUPPLIER_REVIEWS,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.createSupplierReviews
);

// Get All SupplierReviewss by Tenant ID with Pagination
router.get(
  GETALL_SUPPLIER_REVIEWS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.getAllSupplierReviewssByTenantId
);

// Get Single SupplierReviews by Tenant ID & SupplierReviews ID
router.get(
  GET_SUPPLIER_REVIEWS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.getSupplierReviewsByTenantIdAndSupplierReviewsId
);

// Update SupplierReviews
router.put(
  UPDATE_SUPPLIER_REVIEWS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.updateSupplierReviews
);

// Delete SupplierReviews
router.delete(
  DELETE_SUPPLIER_REVIEWS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist",
    "supplier",
  ]),
  supplierController.deleteSupplierReviewsByTenantIdAndSupplierReviewsId
);

module.exports = router;
