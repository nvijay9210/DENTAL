const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const receiptionService = require("../services/ReceiptionService");
const { validateTenantIdAndPageAndLimit } = require("../validations/CommonValidations");
const receiptionValidation = require("../validations/ReceiptionValidation");

/**
 * Create a new receiption
 */
exports.createReceiption = async (req, res, next) => {
  const details = req.body;
  const token=req.token;
  const realm=req.tenant_name;

  try {
    // Validate receiption data
    await receiptionValidation.createReceiptionValidation(details);

    // Create the receiption
    const id = await receiptionService.createReceiption(details,token,realm);
    res.status(201).json({ message: "Receiption created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all receiptions by tenant ID with pagination
 */
exports.getAllReceiptionsByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const receiptions = await receiptionService.getAllReceiptionsByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(receiptions);
  } catch (err) {
    next(err);
  }
};

/**
 * Get receiption by tenant and receiption ID
 */
exports.getReceiptionByTenantIdAndReceiptionId = async (req, res, next) => {
  const { receiption_id, tenant_id } = req.params;

  try {
    const receiption1 = await checkIfExists(
      "receiption",
      "receiption_id",
      receiption_id,
      tenant_id
    );

    if (!receiption1) throw new CustomError("Receiption not found", 404);

    // Fetch receiption details
    const receiption = await receiptionService.getReceiptionByTenantIdAndReceiptionId(
      tenant_id,
      receiption_id
    );
    res.status(200).json(receiption);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing receiption
 */
exports.updateReceiption = async (req, res, next) => {
  const { receiption_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await receiptionValidation.updateReceiptionValidation(receiption_id, details);

    // Update the receiption
    await receiptionService.updateReceiption(receiption_id, details, tenant_id);
    res.status(200).json({ message: "Receiption updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a receiption by ID and tenant ID
 */
exports.deleteReceiptionByTenantIdAndReceiptionId = async (req, res, next) => {
  const { receiption_id, tenant_id } = req.params;

  try {
    // Validate if receiption exists
    const treatment = await checkIfExists(
      "receiption",
      "receiption_id",
      receiption_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("receiptionId not Exists", 404);

    // Delete the receiption
    await receiptionService.deleteReceiptionByTenantIdAndReceiptionId(
      tenant_id,
      receiption_id
    );
    res.status(200).json({ message: "Receiption deleted successfully" });
  } catch (err) {
    next(err);
  }
};
