const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");

const assetColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 6, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "asset_name", type: "varchar", size: 100, null: false },
  { columnname: "asset_type", type: "varchar", size: 255, null: true },
  { columnname: "asset_status", type: "varchar", size: 255, null: true },
  { columnname: "asset_photo", type: "varchar", size: 255, null: true },
  { columnname: "allocated_to", type: "varchar", size: 100, null: true },
  { columnname: "price", type: "int", null: true },
  { columnname: "quantity", type: "int", null: true },
  { columnname: "purchased_date", type: "date", null: true },
  { columnname: "purchased_by", type: "varchar", size: 100, null: true },
  { columnname: "expired_date", type: "date", null: true },
  { columnname: "invoice_number", type: "int", null: true },
  { columnname: "description", type: "text", null: true },
];
// Asset Column Configuration for Validation
const createColumnConfig = [
  ...assetColumnConfig,
  { columnname: "created_by", type: "varchar", size: 20, null: false },
];

const updateColumnConfig = [
  ...assetColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 20, null: false },
];

/**
 * Validate Create Asset Input with Tenant Scope
 */
const createAssetValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfExists("clinic", "clinic_id", details.clinic_id, details.tenant_id),
  ]);
};

/**
 * Validate Update Asset Input with Tenant Scope
 */
const updateAssetValidation = async (assetId, details) => {
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "asset",
    "asset_id",
    assetId,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("Asset not found", 404);
  }
};

module.exports = {
  createAssetValidation,
  updateAssetValidation,
};
