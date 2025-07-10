const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists } = require("../models/checkIfExists");
const supplierService = require("../services/SupplierService");
const { validateTenantIdAndPageAndLimit } = require("../validations/CommonValidations");
const supplierValidation = require("../validations/SupplierValidation");

/**
 * Create a new supplier
 */
exports.createSupplier = async (req, res, next) => {
  const details = req.body;
  const token=req.token;
  const realm=req.realm;

  try {
    // Validate supplier data
    await supplierValidation.createSupplierValidation(details);

    // Create the supplier
    const id = await supplierService.createSupplier(details,token,realm);
    res.status(201).json({ message: "Supplier created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all suppliers by tenant ID with pagination
 */
exports.getAllSuppliersByTenantIdAndClinicId = async (req, res, next) => {
  const { tenant_id,clinic_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const suppliers = await supplierService.getAllSuppliersByTenantIdAndClinicId(
      tenant_id,
      clinic_id,
      page,
      limit
    );
    res.status(200).json(suppliers);
  } catch (err) {
    next(err);
  }
};
exports.getAllSuppliersByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const suppliers = await supplierService.getAllSuppliersByTenantId(
      tenant_id,
      page,
      limit
    );
    res.status(200).json(suppliers);
  } catch (err) {
    next(err);
  }
};

/**
 * Get supplier by tenant and supplier ID
 */
exports.getSupplierByTenantIdAndSupplierId = async (req, res, next) => {
  const { supplier_id, tenant_id } = req.params;

  try {
    const supplier1 = await checkIfExists(
      "supplier",
      "supplier_id",
      supplier_id,
      tenant_id
    );

    if (!supplier1) throw new CustomError("Supplier not found", 404);

    // Fetch supplier details
    const supplier = await supplierService.getSupplierByTenantIdAndSupplierId(
      tenant_id,
      supplier_id
    );
    res.status(200).json(supplier);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing supplier
 */
exports.updateSupplier = async (req, res, next) => {
  const { supplier_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await supplierValidation.updateSupplierValidation(supplier_id, details);

    // Update the supplier
    await supplierService.updateSupplier(supplier_id, details, tenant_id);
    res.status(200).json({ message: "Supplier updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a supplier by ID and tenant ID
 */
exports.deleteSupplierByTenantIdAndSupplierId = async (req, res, next) => {
  const { supplier_id, tenant_id } = req.params;

  try {
    // Validate if supplier exists
    const treatment = await checkIfExists(
      "supplier",
      "supplier_id",
      supplier_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("supplierId not Exists", 404);

    // Delete the supplier
    await supplierService.deleteSupplierByTenantIdAndSupplierId(
      tenant_id,
      supplier_id
    );
    res.status(200).json({ message: "Supplier deleted successfully" });
  } catch (err) {
    next(err);
  }
};
