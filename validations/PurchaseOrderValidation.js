const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists, checkIfExists } = require("../models/checkIfExists");

const purchaseOrdersColumnConfig = [
    { columnname: "tenant_id", type: "int", size: 6, null: false },
    { columnname: "clinic_id", type: "int", size: 11, null: false },
    { columnname: "supplier_id", type: "int", size: 11, null: false },
    { columnname: "order_number", type: "varchar", size: 100, null: true },
    { columnname: "order_date", type: "date", null: true },
    { columnname: "product_name", type: "varchar", size: 255, null: true },
    { columnname: "quantity", type: "int", null: true },
    { columnname: "total_amount", type: "decimal", size: "12,2", null: true },
    {
      columnname: "status",
      enum_values: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      null: true,
      default: "pending"
    },
    { columnname: "delivery_date", type: "date", null: true }
];


// PurchaseOrder Column Configuration for Validation
const createColumnConfig = [
  ...purchaseOrdersColumnConfig,
  { columnname: "created_by", type: "varchar", size: 30, null: false },
];

const updateColumnConfig = [
  ...purchaseOrdersColumnConfig,
  { columnname: "updated_by", type: "varchar", size: 30, null: false },
];
/**
 * Validate Create PurchaseOrder Input with Tenant Scope
 */
const createPurchaseOrderValidation = async (details) => {
  validateInput(details, createColumnConfig);

  // Check if referenced records exist within the same tenant
  await Promise.all([
    checkIfIdExists("tenant", "tenant_id", details.tenant_id),
    checkIfIdExists("clinic", "clinic_id", details.clinic_id),
    checkIfIdExists("supplier", "supplier_id", details.supplier_id),
  ]);
};

/**
 * Validate Update PurchaseOrder Input with Tenant Scope
 */
const updatePurchaseOrderValidation = async (purchase_order_id, details) => {
  validateInput(details, updateColumnConfig);

  const exists = await checkIfExists(
    "purchase_orders",
    "purchase_order_id",
    purchase_order_id,
    details.tenant_id
  );
  if (!exists) {
    throw new CustomError("PurchaseOrder not found", 404);
  }
};

module.exports = {
  createPurchaseOrderValidation,
  updatePurchaseOrderValidation,
};
