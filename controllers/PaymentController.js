const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const paymentService = require("../services/PaymentService");
const { isValidDate } = require("../utils/DateUtils");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");
const paymentValidation = require("../validations/PaymentValidation");

/**
 * Create a new payment
 */
exports.createPayment = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate payment data
    await paymentValidation.createPaymentValidation(details);

    // Create the payment
    const id = await paymentService.createPayment(details);
    res.status(201).json({ message: "Payment created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all payments by tenant ID with pagination
 */
exports.getAllPaymentsByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const payments = await paymentService.getAllPaymentsByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(payments);
  } catch (err) {
    next(err);
  }
};
/**
 * Get payment by tenant and payment ID
 */
exports.getPaymentByTenantIdAndPaymentId = async (req, res, next) => {
  const { payment_id, tenant_id } = req.params;

  try {
    // Validate if payment exists
    const payment1=await checkIfExists(
      "payment",
      "payment_id",
      payment_id,
      tenant_id
    );
    if(!payment1) throw new CustomError('Payment not found',404)

    // Fetch payment details
    const payment = await paymentService.getPaymentByTenantIdAndPaymentId(
      tenant_id,
      payment_id
    );
    res.status(200).json(payment);
  } catch (err) {
    next(err);
  }
};
exports.getPaymentByTenantAndAppointmentId = async (req, res, next) => {
  const { appointment_id, tenant_id } = req.params;

  try {
    // Validate if payment exists
    const appointment1=await checkIfExists(
      "appointment",
      "appointment_id",
      appointment_id,
      tenant_id
    );
    if(!appointment1) throw new CustomError('Appointment not found',404)

    // Fetch payment details
    const payment = await paymentService.getPaymentByTenantAndAppointmentId(
      tenant_id,
      appointment_id
    );
    res.status(200).json(payment);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing payment
 */
exports.updatePayment = async (req, res, next) => {
  const { payment_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await paymentValidation.updatePaymentValidation(payment_id, details);

    // Update the payment
    await paymentService.updatePayment(payment_id, details, tenant_id);
    res.status(200).json({ message: "Payment updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a payment by ID and tenant ID
 */
exports.deletePaymentByTenantIdAndPaymentId = async (req, res, next) => {
  const { payment_id, tenant_id } = req.params;

  try {
    // Validate if payment exists
    const treatment = await checkIfExists(
      "payment",
      "payment_id",
      payment_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("PaymentId not Exists", 404);

    // Delete the payment
    await paymentService.deletePaymentByTenantIdAndPaymentId(
      tenant_id,
      payment_id
    );
    res.status(200).json({ message: "Payment deleted successfully" });
  } catch (err) {
    next(err);
  }
};
