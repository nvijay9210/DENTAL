const { checkIfExists } = require("../models/checkIfExists");
const assetService = require("../services/AssetService");
const assetValidation = require("../validations/AssetValidation");
const { validateTenantIdAndPageAndLimit } = require("../validations/CommonValidations");

/**
 * Create a new asset
 */
exports.createAsset = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate asset data
    await assetValidation.createAssetValidation(details);

    // Create the asset
    const id = await assetService.createAsset(details);
    res.status(201).json({ message: "Asset created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all assets by tenant ID with pagination
 */
exports.getAllAssetsByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  try {
    await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
    const assets = await assetService.getAllAssetsByTenantId(tenant_id, page, limit);
    res.status(200).json(assets);
  } catch (err) {
    next(err);
  }
};

/**
 * Get asset by tenant and asset ID
 */
exports.getAssetByTenantIdAndAssetId = async (req, res, next) => {
  const { asset_id, tenant_id } = req.params;

  try {
    const asset1=await checkIfExists('asset','asset_id',asset_id,tenant_id);
    if(!asset1) throw new CustomError('Asset not found',404)

    // Fetch asset details
    const asset = await assetService.getAssetByTenantIdAndAssetId(
      tenant_id,
      asset_id
    );
    res.status(200).json(asset);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing asset
 */
exports.updateAsset = async (req, res, next) => {
  const { asset_id,tenant_id } = req.params;
  const details = req.body;

  try {
    
    // Validate update input
    await assetValidation.updateAssetValidation(asset_id, details);

    // Update the asset
    await assetService.updateAsset(asset_id, details, tenant_id);
    res.status(200).json({ message: "Asset updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a asset by ID and tenant ID
 */
exports.deleteAssetByTenantIdAndAssetId = async (req, res, next) => {
  const { asset_id, tenant_id } = req.params;

  try {
    // Validate if asset exists
    const asset1=await checkIfExists('asset','asset_id',asset_id,tenant_id);
    if(!asset1) throw new CustomError('Asset not found',404)

    // Delete the asset
    await assetService.deleteAssetByTenantIdAndAssetId(tenant_id, asset_id);
    res.status(200).json({ message: "Asset deleted successfully" });
  } catch (err) {
    next(err);
  }
};

exports.getAllAssetsByTenantIdAndClinicIdAndStartDateAndEndDate = async (
  req,
  res,
  next
) => {
  const { tenant_id, clinic_id } = req.params;
  const {start_date, end_date } = req.query;
  try {
    if (!(isValidDate(start_date) && isValidDate(end_date)))
      throw new CustomError("Startdate or enddate format invalid", 400);
    const assets =
      await assetService.getAllAssetsByTenantIdAndClinicIdAndStartDateAndEndDate(
        tenant_id,
        clinic_id,
        start_date,
        end_date
      );
    res.status(200).json(assets);
  } catch (err) {
    next(err);
  }
};