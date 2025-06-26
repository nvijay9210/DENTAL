const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");
const { recordExists } = require("../query/Records");

const supplierReviewsColumnConfig = [
    { columnname: "tenant_id", type: "int", size: 6, null: false },
    { columnname: "clinic_id", type: "int", size: 11, null: false },
    { columnname: "supplier_id", type: "int", size: 11, null: false },
    { columnname: "rating_quality", type: "int", size: 1, null: true, check: "BETWEEN 1 AND 5" },
    { columnname: "rating_delivery", type: "int", size: 1, null: true, check: "BETWEEN 1 AND 5" },
    { columnname: "rating_communication", type: "int", size: 1, null: true, check: "BETWEEN 1 AND 5" },
    { columnname: "comment", type: "text", null: true },
    { columnname: "reviewed_by", type: "varchar", size: 30, null: false }
];


// SupplierReviews Column Configuration for Validation
const createColumnConfig = [
  ...supplierReviewsColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...supplierReviewsColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];
/**
 * Validate Create SupplierReviews Input with Tenant Scope
 */
const createSupplierReviewsValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfIdExists("clinic", "clinic_id", details.clinic_id),
    checkIfIdExists("supplier", "supplier_id", details.supplier_id),
  ]);
};

/**
 * Validate Update SupplierReviews Input with Tenant Scope
 */
const updateSupplierReviewsValidation = async (supplier_review_id, details) => {
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "supplier_reviews",
    "supplier_review_id",
    supplier_review_id,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("SupplierReviews not found", 404);
  }
};

module.exports = {
  createSupplierReviewsValidation,
  updateSupplierReviewsValidation,
};
