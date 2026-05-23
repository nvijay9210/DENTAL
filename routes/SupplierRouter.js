const express = require("express");
const router = express.Router();
const multer = require("multer");

const supplierController = require("../controllers/SupplierController");
const {
  ADD_SUPPLIER,
  GETALL_SUPPLIER_TENANT,
  GET_SUPPLIER_TENANT,
  UPDATE_SUPPLIER_TENANT,
  DELETE_SUPPLIER_TENANT,
  GETALL_SUPPLIER_TENANT_CLINIC,
} = require("./RouterPath");
const suppliervalidation = require("../validations/SupplierValidation");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");
const { uploadFileMiddleware, uploadFileMiddleware2 } = require("../utils/UploadFiles");
const globalInvalidationMiddleware = require("../middlewares/GlobalInvalidationMiddleware");
const { globalCacheMiddleware } = require("../middlewares/GlobalCacheMiddleware");
// Setup multer memory storage once
const upload = multer({ storage: multer.memoryStorage() });

const supplierFileMiddleware = uploadFileMiddleware2({
  folderName: "Supplier",
  fileFields: [
    {
      fieldName: "logo_url",
      maxSizeMB: 2,
      multiple: false,
    },
  ],
  createValidationFn: suppliervalidation.createSupplierValidation,
  updateValidationFn: suppliervalidation.updateSupplierValidation,
});

// Create Supplier
router.post(
  ADD_SUPPLIER,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist","receptionist","superuser",
    "supplier",
  ]),
  upload.any(),
  supplierFileMiddleware,
  globalInvalidationMiddleware,
  supplierController.createSupplier
);

// Get All Suppliers by Tenant ID with Pagination
router.get(
  GETALL_SUPPLIER_TENANT_CLINIC,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist","receptionist","superuser",
    "supplier",
  ]),
  globalCacheMiddleware,
  supplierController.getAllSuppliersByTenantIdAndClinicId
);
router.get(
  GETALL_SUPPLIER_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist","receptionist","superuser",
    "supplier",
  ]),
  globalCacheMiddleware,
  supplierController.getAllSuppliersByTenantId
);

// Get Single Supplier by Tenant ID & Supplier ID
router.get(
  GET_SUPPLIER_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist","receptionist","superuser",
    "supplier",
  ]),globalCacheMiddleware,
  supplierController.getSupplierByTenantIdAndSupplierId
);

// Update Supplier
router.put(
  UPDATE_SUPPLIER_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist","receptionist",
    "supplier",
  ]),
  upload.any(),
  supplierFileMiddleware,
  globalInvalidationMiddleware,
  supplierController.updateSupplier
);

// Delete Supplier
router.delete(
  DELETE_SUPPLIER_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist","receptionist","superuser",
    "supplier",
  ]),
  globalInvalidationMiddleware,
  supplierController.deleteSupplierByTenantIdAndSupplierId
);

module.exports = router;
