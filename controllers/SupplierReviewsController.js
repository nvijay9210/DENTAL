const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists, checkIfIdExists } = require("../models/checkIfExists");
const supplierReviewsService = require("../services/SupplierReviewService");
const { validateTenantIdAndPageAndLimit } = require("../validations/CommonValidations");
const supplierReviewsValidation = require("../validations/SupplierReviewsValidation");

/**
 * Create a new supplierReviews
 */
exports.createSupplierReviews = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate supplierReviews data
    await supplierReviewsValidation.createSupplierReviewsValidation(details);

    // Create the supplierReviews
    const id = await supplierReviewsService.createSupplierReviews(details);
    res.status(201).json({ message: "SupplierReviews created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all supplierReviewss by tenant ID with pagination
 */
exports.getAllSupplierReviewssByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const supplierReviewss = await supplierReviewsService.getAllSupplierReviewssByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(supplierReviewss);
  } catch (err) {
    next(err);
  }
};
exports.getAllSupplierReviewsByTenantIdAndSupplierId = async (req, res, next) => {
  const { tenant_id,supplier_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  await checkIfIdExists('supplier','supplier_id',supplier_id)
  try {
    const supplierReviewss = await supplierReviewsService.getAllSupplierReviewsByTenantIdAndSupplierId(
      tenant_id,
      supplier_id,
      page,
      limit
    );
    res.status(200).json(supplierReviewss);
  } catch (err) {
    next(err);
  }
};

/**
 * Get supplierReviews by tenant and supplierReviews ID
 */
exports.getSupplierReviewsByTenantIdAndSupplierReviewsId = async (req, res, next) => {
  const { supplier_review_id, tenant_id } = req.params;

  try {
    const supplierReviews1 = await checkIfExists(
      "supplier_reviews",
      "supplier_review_id",
      supplier_review_id,
      tenant_id
    );

    if (!supplierReviews1) throw new CustomError("SupplierReviews not found", 404);

    // Fetch supplierReviews details
    const supplierReviews = await supplierReviewsService.getSupplierReviewsByTenantIdAndSupplierReviewsId(
      tenant_id,
      supplier_review_id
    );
    res.status(200).json(supplierReviews);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing supplierReviews
 */
exports.updateSupplierReviews = async (req, res, next) => {
  const { supplier_review_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await supplierReviewsValidation.updateSupplierReviewsValidation(supplier_review_id, details);

    // Update the supplierReviews
    await supplierReviewsService.updateSupplierReviews(supplier_review_id, details, tenant_id);
    res.status(200).json({ message: "SupplierReviews updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a supplierReviews by ID and tenant ID
 */
exports.deleteSupplierReviewsByTenantIdAndSupplierReviewsId = async (req, res, next) => {
  const { supplier_review_id, tenant_id } = req.params;

  try {
    // Validate if supplierReviews exists
    const treatment = await checkIfExists(
      "supplier_reviews",
      "supplier_review_id",
      supplier_review_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("supplierReviewsId not Exists", 404);

    // Delete the supplierReviews
    await supplierReviewsService.deleteSupplierReviewsByTenantIdAndSupplierReviewsId(
      tenant_id,
      supplier_review_id
    );
    res.status(200).json({ message: "SupplierReviews deleted successfully" });
  } catch (err) {
    next(err);
  }
};
