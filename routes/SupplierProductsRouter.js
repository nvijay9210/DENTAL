const express = require("express");
const router = express.Router();
const multer = require("multer");

const supplierController = require("../controllers/SupplierProductsController");
const {
  ADD_SUPPLIER_PRODUCTS,
  GETALL_SUPPLIER_PRODUCTS_TENANT,
  GET_SUPPLIER_PRODUCTS_TENANT,
  UPDATE_SUPPLIER_PRODUCTS_TENANT,
  DELETE_SUPPLIER_PRODUCTS_TENANT,
  GETALL_SUPPLIER_PRODUCTS_TENANT_CLINIC,
  GETALL_SUPPLIER_PRODUCTS_TENANT_SUPPLIER,
} = require("./RouterPath");
const suppliervalidation = require("../validations/SupplierProductsValidation");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

const { uploadFileMiddleware } = require("../utils/UploadFiles");
// Setup multer memory storage once
const upload = multer({ storage: multer.memoryStorage() });

const supplierProductsFileMiddleware = uploadFileMiddleware({
  folderName: "Supplier_products",
  fileFields: [
    {
      fieldName: "image_url",
      maxSizeMB: 2,
      multiple: false,
    },
  ],

  createValidationFn: suppliervalidation.createSupplierProductsValidation,
  updateValidationFn: suppliervalidation.updateSupplierProductsValidation,
});

// Create SupplierProducts
router.post(
  ADD_SUPPLIER_PRODUCTS,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist","receptionist",
    "supplier",
  ]),
  upload.any(),
  supplierProductsFileMiddleware,
  supplierController.createSupplierProducts
);

// Get All SupplierProductss by Tenant ID with Pagination
router.get(
  GETALL_SUPPLIER_PRODUCTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist","receptionist",
    "supplier",
  ]),
  supplierController.getAllSupplierProductssByTenantId
);
router.get(
  GETALL_SUPPLIER_PRODUCTS_TENANT_SUPPLIER,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist","receptionist",
    "supplier",
  ]),
  supplierController.getAllSupplierProductssByTenantIdAndSupplierId
);

// Get Single SupplierProducts by Tenant ID & SupplierProducts ID
router.get(
  GET_SUPPLIER_PRODUCTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist","receptionist",
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
    "dentist","receptionist",
    "supplier",
  ]),
  upload.any(),
  supplierProductsFileMiddleware,
  supplierController.updateSupplierProducts
);

// Delete SupplierProducts
router.delete(
  DELETE_SUPPLIER_PRODUCTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "dentist","receptionist",
    "supplier",
  ]),
  supplierController.deleteSupplierProductsByTenantIdAndSupplierProductsId
);

module.exports = router;
