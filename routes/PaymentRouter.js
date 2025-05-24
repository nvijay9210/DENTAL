const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/PaymentController");
const {
  ADD_PAYMENT,
  GETALL_PAYMENT_TENANT,
  GET_PAYMENT_TENANT,
  UPDATE_PAYMENT_TENANT,
  DELETE_PAYMENT_TENANT,
  GETALL_PAYMENT_REPORT_TENANT_CLINIC,
  GET_PAYEMENT_TENANT_APPOINTMENT,
} = require("./RouterPath");
const paymentvalidation = require("../validations/PaymentValidation");

// Create Payment
router.post(
  ADD_PAYMENT,
  paymentController.createPayment
);

// Get All Payments by Tenant ID with Pagination
router.get(GETALL_PAYMENT_TENANT, paymentController.getAllPaymentsByTenantId);

// Get Single Payment by Tenant ID & Payment ID
router.get(GET_PAYMENT_TENANT, paymentController.getPaymentByTenantIdAndPaymentId);

router.get(GET_PAYEMENT_TENANT_APPOINTMENT, paymentController.getPaymentByTenantAndAppointmentId);

// Update Payment
router.put(
  UPDATE_PAYMENT_TENANT,
  paymentController.updatePayment
);

// Delete Payment
router.delete(
  DELETE_PAYMENT_TENANT,
  paymentController.deletePaymentByTenantIdAndPaymentId
);

module.exports = router;
