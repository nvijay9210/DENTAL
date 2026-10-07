const express = require("express");
const router = express.Router();

const supplierPaymentController = require("../controllers/SupplierPaymentController");
const {
  ADD_SUPPLIER_PAYMENTS,
  GETALL_SUPPLIER_PAYMENTS_TENANT,
  GET_SUPPLIER_PAYMENTS_TENANT,
  UPDATE_SUPPLIER_PAYMENTS_TENANT,
  DELETE_SUPPLIER_PAYMENTS_TENANT,
  GET_SUPPLIER_PAYMENTS_TENANT_PURCHASEORDER,
  GETALL_SUPPLIER_PAYMENTS_TENANT_SUPPLIER,
  ADD_SUPPLIER_FULL_PAYMENTS,
  UPDATE_SUPPLIER_FULL_PAYMENT_TENANT,
} = require("./RouterPath");
const supplierPaymentvalidation = require("../validations/SupplierPaymentsValidation");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

const multer = require("multer");

const { uploadFileMiddleware } = require("../utils/UploadFiles");
// Setup multer memory storage once
const upload = multer({ storage: multer.memoryStorage() });

const supplierPaymentFileMiddleware = uploadFileMiddleware({
  folderName: "SupplierPayment",
  fileFields: [
    {
      fieldName: "supplier_payment_documents",
      maxSizeMB: process.env.DOCUMENT_MAX_SIZE,
      multiple: true
    },
  ],
  createValidationFn: supplierPaymentvalidation.createSupplierPaymentsValidation,
  updateValidationFn: supplierPaymentvalidation.updateSupplierPaymentsValidation,
});

// Create SupplierPayments
router.post(
  ADD_SUPPLIER_PAYMENTS,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "supplier",
  ]),
  upload.any(),
  supplierPaymentFileMiddleware,
  supplierPaymentController.createSupplierPayments
);

router.post(
  ADD_SUPPLIER_FULL_PAYMENTS,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "supplier",
    "receptionist",
  ]),
  upload.any(),
  supplierPaymentFileMiddleware,
  supplierPaymentController.createSupplierFullPayments
);

// Get All SupplierPaymentss by Tenant ID with Pagination
router.get(
  GETALL_SUPPLIER_PAYMENTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "supplier",
    "receptionist",
  ]),
  supplierPaymentController.getAllSupplierPaymentssByTenantId
);

router.get(
  GETALL_SUPPLIER_PAYMENTS_TENANT_SUPPLIER,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "supplier",
    "receptionist",
  ]),
  supplierPaymentController.getAllSupplierPaymentssByTenantIdAndSupplierId
);

// Get Single SupplierPayments by Tenant ID & SupplierPayments ID
router.get(
  GET_SUPPLIER_PAYMENTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "supplier",
    "receptionist",
  ]),
  supplierPaymentController.getSupplierPaymentsByTenantIdAndSupplierPaymentsId
);
router.get(
  GET_SUPPLIER_PAYMENTS_TENANT_PURCHASEORDER,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "supplier",
    "receptionist",
  ]),
  supplierPaymentController.getSupplierPaymentsByTenantAndPurchaseOrderId
);

// Update SupplierPayments
router.put(
  UPDATE_SUPPLIER_PAYMENTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "supplier",
    "receptionist",
  ]),
  upload.any(),
  supplierPaymentFileMiddleware,
  supplierPaymentController.updateSupplierPayments
);
router.put(
  UPDATE_SUPPLIER_FULL_PAYMENT_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "supplier",
    "receptionist",
  ]),
  upload.any(),
  supplierPaymentFileMiddleware,
  supplierPaymentController.updateSupplierPayment
);

// Delete SupplierPayments
router.delete(
  DELETE_SUPPLIER_PAYMENTS_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "superuser",
    "dentist",
    "supplier",
    "receptionist",
  ]),
  supplierPaymentController.deleteSupplierPaymentsByTenantIdAndSupplierPaymentsId
);

module.exports = router;
