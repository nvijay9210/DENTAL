const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const receptionService = require("../services/ReceptionService");
const { validateTenantIdAndPageAndLimit } = require("../validations/CommonValidations");
const receptionValidation = require("../validations/ReceptionValidation");

/**
 * Create a new reception
 */
exports.createReception = async (req, res, next) => {
  const details = req.body;
  const token=req.token;
  const realm=req.tenant_name;

  try {
    // Validate reception data
    await receptionValidation.createReceptionValidation(details);

    // Create the reception
    const id = await receptionService.createReception(details,token,realm);
    res.status(201).json({ message: "Reception created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all receptions by tenant ID with pagination
 */
exports.getAllReceptionsByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const receptions = await receptionService.getAllReceptionsByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(receptions);
  } catch (err) {
    next(err);
  }
};

/**
 * Get reception by tenant and reception ID
 */
exports.getReceptionByTenantIdAndReceptionId = async (req, res, next) => {
  const { reception_id, tenant_id } = req.params;

  try {
    const reception1 = await checkIfExists(
      "reception",
      "reception_id",
      reception_id,
      tenant_id
    );

    if (!reception1) throw new CustomError("Reception not found", 404);

    // Fetch reception details
    const reception = await receptionService.getReceptionByTenantIdAndReceptionId(
      tenant_id,
      reception_id
    );
    res.status(200).json(reception);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing reception
 */
exports.updateReception = async (req, res, next) => {
  const { reception_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await receptionValidation.updateReceptionValidation(reception_id, details);

    // Update the reception
    await receptionService.updateReception(reception_id, details, tenant_id);
    res.status(200).json({ message: "Reception updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a reception by ID and tenant ID
 */
exports.deleteReceptionByTenantIdAndReceptionId = async (req, res, next) => {
  const { reception_id, tenant_id } = req.params;

  try {
    // Validate if reception exists
    const treatment = await checkIfExists(
      "reception",
      "reception_id",
      reception_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("receptionId not Exists", 404);

    // Delete the reception
    await receptionService.deleteReceptionByTenantIdAndReceptionId(
      tenant_id,
      reception_id
    );
    res.status(200).json({ message: "Reception deleted successfully" });
  } catch (err) {
    next(err);
  }
};
