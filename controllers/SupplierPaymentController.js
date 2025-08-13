const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const {
  allocateSupplierPayment,
  getAllUnpaidSupplierPaymentssByTenantIdAndSupplierId,
  getAllUnpaidSupplierPaymentssByTenantIdAndClinicIdAndSupplierId,
  allocateSupplierPaymentFIFO,
} = require("../models/SupplierPaymentsModel");
const supplierPaymentsService = require("../services/SupplierPaymentsService");
const { saveDocuments } = require("../utils/UploadFiles");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");
const supplierPaymentsValidation = require("../validations/SupplierPaymentsValidation");

/**
 * Create a new supplierPayments
 */
exports.createSupplierPayments = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate supplierPayments data
    await supplierPaymentsValidation.createSupplierPaymentsValidation(details);

    // Create the supplierPayments
    const id = await supplierPaymentsService.createSupplierPayments(details);
    res.status(201).json({ message: "SupplierPayments created", id });
  } catch (err) {
    next(err);
  }
};

//working
exports.createSupplierFullPayments = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate supplierPayments data
    await supplierPaymentsValidation.createSupplierPaymentsValidation(details);

    const supplierpayments =
      await getAllUnpaidSupplierPaymentssByTenantIdAndClinicIdAndSupplierId(
        details.tenant_id,
        details.clinic_id,
        details.supplier_id
      );

    let ids = [];

    // Use for...of to properly await each async call
    for (const supplierpayment of supplierpayments) {
      const sup = await allocateSupplierPaymentFIFO(
        details.supplier_id,
        details.clinic_id,
        details.tenant_id,
        details.amount,
        supplierpayment
      );
      ids.push(sup);
    }

    // Now loop again to save documents for all IDs
    for (const id of ids) {
      await saveDocuments({
        table_name: "supplier_payments",
        table_id: id,
        field_name: "supplier_payment_documents",
        files: details.supplier_payment_documents,
        created_by: details.created_by,
      });
    }

    res.status(201).json({ message: "SupplierPayments created", ids });
  } catch (err) {
    next(err);
  }
};



exports.updateSupplierPayment = async (req, res) => {
  try {
    const { tenant_id, clinic_id, supplier_payment_id } = req.params;
    const updateData = req.body;

    const result = await supplierPaymentsService.updateSupplierPaymentService(
      supplier_payment_id,
      tenant_id,
      clinic_id,
      updateData
    );

    res.status(200).json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.allocateSupplierPayment = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate supplierPayments data
    await supplierPaymentsValidation.createSupplierPaymentsValidation(details);

    // Create the supplierPayments
    const id = await allocateSupplierPayment(
      details.supplier_id,
      details.clinic_id,
      details.tenant_id,
      details.paid_amount
    );
    res.status(201).json({ message: "SupplierPayments created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all supplierPaymentss by tenant ID with pagination
 */
exports.getAllSupplierPaymentssByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const supplierPaymentss =
      await supplierPaymentsService.getAllSupplierPaymentssByTenantId(
        tenant_id,
        page,
        limit
      );
    res.status(200).json(supplierPaymentss);
  } catch (err) {
    next(err);
  }
};

exports.getAllSupplierPaymentssByTenantIdAndSupplierId = async (
  req,
  res,
  next
) => {
  const { tenant_id, supplier_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const supplierPaymentss =
      await supplierPaymentsService.getAllSupplierPaymentssByTenantIdAndSupplierId(
        tenant_id,
        supplier_id,
        page,
        limit
      );
    res.status(200).json(supplierPaymentss);
  } catch (err) {
    next(err);
  }
};

/**
 * Get supplierPayments by tenant and supplierPayments ID
 */
exports.getSupplierPaymentsByTenantIdAndSupplierPaymentsId = async (
  req,
  res,
  next
) => {
  const { supplier_payment_id, tenant_id } = req.params;

  try {
    const supplierPayments1 = await checkIfExists(
      "supplier_payments",
      "supplier_payment_id",
      supplier_payment_id,
      tenant_id
    );

    if (!supplierPayments1)
      throw new CustomError("SupplierPayments not found", 404);

    // Fetch supplierPayments details
    const supplierPayments =
      await supplierPaymentsService.getSupplierPaymentsByTenantIdAndSupplierPaymentsId(
        tenant_id,
        supplier_payment_id
      );
    res.status(200).json(supplierPayments);
  } catch (err) {
    next(err);
  }
};
exports.getSupplierPaymentsByTenantAndPurchaseOrderId = async (
  req,
  res,
  next
) => {
  const { purchase_order_id, tenant_id } = req.params;

  try {
    const supplierPayments1 = await checkIfExists(
      "purchase_orders",
      "purchase_order_id",
      purchase_order_id,
      tenant_id
    );

    if (!supplierPayments1)
      throw new CustomError("SupplierPayments not found", 404);

    // Fetch supplierPayments details
    const supplierPayments =
      await supplierPaymentsService.getSupplierPaymentsByTenantAndPurchaseOrderId(
        tenant_id,
        purchase_order_id
      );
    res.status(200).json(supplierPayments);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing supplierPayments
 */
exports.updateSupplierPayments = async (req, res, next) => {
  const { supplier_payment_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await supplierPaymentsValidation.updateSupplierPaymentsValidation(
      supplier_payment_id,
      details
    );

    // Update the supplierPayments
    await supplierPaymentsService.updateSupplierPayments(
      supplier_payment_id,
      details,
      tenant_id
    );
    res.status(200).json({ message: "SupplierPayments updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a supplierPayments by ID and tenant ID
 */
exports.deleteSupplierPaymentsByTenantIdAndSupplierPaymentsId = async (
  req,
  res,
  next
) => {
  const { supplier_payment_id, tenant_id } = req.params;

  try {
    // Validate if supplierPayments exists
    const treatment = await checkIfExists(
      "supplier_payments",
      "supplier_payment_id",
      supplier_payment_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("supplierPaymentsId not Exists", 404);

    // Delete the supplierPayments
    await supplierPaymentsService.deleteSupplierPaymentsByTenantIdAndSupplierPaymentsId(
      tenant_id,
      supplier_payment_id
    );
    res.status(200).json({ message: "SupplierPayments deleted successfully" });
  } catch (err) {
    next(err);
  }
};
