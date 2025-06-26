const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const supplierProductsService = require("../services/SupplierProductsService");
const { validateTenantIdAndPageAndLimit } = require("../validations/CommonValidations");
const supplierProductsValidation = require("../validations/SupplierProductsValidation");

/**
 * Create a new supplierProducts
 */
exports.createSupplierProducts = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate supplierProducts data
    await supplierProductsValidation.createSupplierProductsValidation(details);

    // Create the supplierProducts
    const id = await supplierProductsService.createSupplierProducts(details);
    res.status(201).json({ message: "SupplierProducts created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all supplierProductss by tenant ID with pagination
 */
exports.getAllSupplierProductssByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const supplierProductss = await supplierProductsService.getAllSupplierProductssByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(supplierProductss);
  } catch (err) {
    next(err);
  }
};

/**
 * Get supplierProducts by tenant and supplierProducts ID
 */
exports.getSupplierProductsByTenantIdAndSupplierProductsId = async (req, res, next) => {
  const { supplier_product_id, tenant_id } = req.params;

  try {
    const supplierProducts1 = await checkIfExists(
      "supplier_products",
      "supplier_product_id",
      supplier_product_id,
      tenant_id
    );

    if (!supplierProducts1) throw new CustomError("SupplierProducts not found", 404);

    // Fetch supplierProducts details
    const supplierProducts = await supplierProductsService.getSupplierProductsByTenantIdAndSupplierProductsId(
      tenant_id,
      supplier_product_id
    );
    res.status(200).json(supplierProducts);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing supplierProducts
 */
exports.updateSupplierProducts = async (req, res, next) => {
  const { supplier_product_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await supplierProductsValidation.updateSupplierProductsValidation(supplier_product_id, details);

    // Update the supplierProducts
    await supplierProductsService.updateSupplierProducts(supplier_product_id, details, tenant_id);
    res.status(200).json({ message: "SupplierProducts updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a supplierProducts by ID and tenant ID
 */
exports.deleteSupplierProductsByTenantIdAndSupplierProductsId = async (req, res, next) => {
  const { supplier_product_id, tenant_id } = req.params;

  try {
    // Validate if supplierProducts exists
    const treatment = await checkIfExists(
      "supplier_products",
      "supplier_product_id",
      supplier_product_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("supplierProductsId not Exists", 404);

    // Delete the supplierProducts
    await supplierProductsService.deleteSupplierProductsByTenantIdAndSupplierProductsId(
      tenant_id,
      supplier_product_id
    );
    res.status(200).json({ message: "SupplierProducts deleted successfully" });
  } catch (err) {
    next(err);
  }
};
