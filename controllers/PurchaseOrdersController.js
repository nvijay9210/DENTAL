const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists, checkIfIdExists } = require("../models/checkIfExists");
const purchaseOrdersService = require("../services/PurchaseOrderService");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");
const purchaseOrdersValidation = require("../validations/PurchaseOrderValidation");

/**
 * Create a new purchaseOrders
 */
exports.createPurchaseOrder = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate purchaseOrders data
    await purchaseOrdersValidation.createPurchaseOrderValidation(details);

    // Create the purchaseOrders
    const id = await purchaseOrdersService.createPurchaseOrder(details);
    res.status(201).json({ message: "PurchaseOrder created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all purchaseOrderss by tenant ID with pagination
 */
exports.getAllPurchaseOrdersByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const purchaseOrderss =
      await purchaseOrdersService.getAllPurchaseOrdersByTenantId(
        tenant_id,
        page,
        limit
      );
    res.status(200).json(purchaseOrderss);
  } catch (err) {
    next(err);
  }
};

exports.getAllPurchaseOrdersByTenantIdAndSupplierId = async (
  req,
  res,
  next
) => {
  const { tenant_id, supplier_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  await checkIfIdExists("supplier", "supplier_id", supplier_id);
  try {
    const purchaseOrderss =
      await purchaseOrdersService.getAllPurchaseOrdersByTenantIdAndSupplierId(
        tenant_id,
        supplier_id,
        page,
        limit
      );
    res.status(200).json(purchaseOrderss);
  } catch (err) {
    next(err);
  }
};

exports.getAllPurchaseOrdersByTenantIdAndClinicId = async (
  req,
  res,
  next
) => {
  const { tenant_id, clinic_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  await checkIfIdExists("clinic", "clinic_id", clinic_id);
  try {
    const purchaseOrderss =
      await purchaseOrdersService.getAllPurchaseOrdersByTenantIdAndClinicId(
        tenant_id,
        clinic_id,
        page,
        limit
      );
    res.status(200).json(purchaseOrderss);
  } catch (err) {
    next(err);
  }
};

/**
 * Get purchaseOrders by tenant and purchaseOrders ID
 */
exports.getPurchaseOrderByTenantIdAndPurchaseOrderId = async (
  req,
  res,
  next
) => {
  const { purchase_order_id, tenant_id } = req.params;

  try {
    const purchaseOrders1 = await checkIfExists(
      "purchase_orders",
      "purchase_order_id",
      purchase_order_id,
      tenant_id
    );

    if (!purchaseOrders1) throw new CustomError("PurchaseOrder not found", 404);

    // Fetch purchaseOrders details
    const purchaseOrders =
      await purchaseOrdersService.getPurchaseOrderByTenantIdAndPurchaseOrderId(
        tenant_id,
        purchase_order_id
      );
    res.status(200).json(purchaseOrders);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing purchaseOrders
 */
exports.updatePurchaseOrder = async (req, res, next) => {
  const { purchase_order_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await purchaseOrdersValidation.updatePurchaseOrderValidation(
      purchase_order_id,
      details
    );

    // Update the purchaseOrders
    await purchaseOrdersService.updatePurchaseOrder(
      purchase_order_id,
      details,
      tenant_id
    );
    res.status(200).json({ message: "PurchaseOrder updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a purchaseOrders by ID and tenant ID
 */
exports.deletePurchaseOrderByTenantIdAndPurchaseOrderId = async (
  req,
  res,
  next
) => {
  const { purchase_order_id, tenant_id } = req.params;

  try {
    // Validate if purchaseOrders exists
    const treatment = await checkIfExists(
      "purchase_orders",
      "purchase_order_id",
      purchase_order_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("purchaseOrdersId not Exists", 404);

    // Delete the purchaseOrders
    await purchaseOrdersService.deletePurchaseOrderByTenantIdAndPurchaseOrderId(
      tenant_id,
      purchase_order_id
    );
    res.status(200).json({ message: "PurchaseOrder deleted successfully" });
  } catch (err) {
    next(err);
  }
};
