const { CustomError } = require("../middlewares/CustomeError");
const purchase_orderModel = require("../models/PurchaseOrderModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");

// Field mapping for purchase_orders (similar to treatment)

const purchase_orderFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  supplier_id: (val) => val,
  dentist_id: (val) => val,
  purchase_order_id: (val) => val,
  product_name: (val) => val,
  order_number: (val) => val,
  order_date: (val) => formatDateOnly(val),
  quantity: (val) => val? parseInt(val) : 0,
  total_amount: (val) => val? parseFloat(val) : 0,
  status: (val) => val,
  delivery_date: (val) => formatDateOnly(val),
};
const purchase_orderFieldsReverseMap = {
  purchase_order_id: (val) => val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  dentist_id: (val) => val,
  supplier_id: (val) => val,
  product_name: (val) => val,
  order_number: (val) => val,
  order_date: (val) => formatDateOnly(val),
  quantity: (val) => val? parseInt(val) : 0,
  total_amount: (val) => val? parseFloat(val) : 0,
  status: (val) => val,
  delivery_date: (val) => formatDateOnly(val),
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create PurchaseOrder
const createPurchaseOrder = async (data) => {
  const fieldMap = {
    ...purchase_orderFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const purchase_orderId = await purchase_orderModel.createPurchaseOrders(
      "purchase_orders",
      columns,
      values
    );
    await invalidateCacheByPattern("purchase_order:*");
    return purchase_orderId;
  } catch (error) {
    console.error("Failed to create purchase_order:", error);
    throw new CustomError(
      `Failed to create purchase_order: ${error.message}`,
      404
    );
  }
};

// Get All PurchaseOrders by Tenant ID with Caching
const getAllPurchaseOrdersByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `purchase_order:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const purchase_orders = await getOrSetCache(cacheKey, async () => {
      const result = await purchase_orderModel.getAllPurchaseOrderssByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = purchase_orders.data.map((purchase_order) =>
      helper.convertDbToFrontend(purchase_order, purchase_orderFieldsReverseMap)
    );

    return { data: convertedRows, total: purchase_orders.total };
  } catch (err) {
    console.error("Database error while fetching purchase_orders:", err);
    throw new CustomError("Failed to fetch purchase_orders", 404);
  }
};

// Get PurchaseOrder by ID & Tenant
const getPurchaseOrderByTenantIdAndPurchaseOrderId = async (
  tenantId,
  purchase_orderId
) => {
  try {
    const purchase_order =
      await purchase_orderModel.getPurchaseOrdersByTenantAndPurchaseOrdersId(
        tenantId,
        purchase_orderId
      );

    const convertedRows = helper.convertDbToFrontend(
      purchase_order,
      purchase_orderFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError(
      "Failed to get purchase_order: " + error.message,
      404
    );
  }
};

// Update PurchaseOrder
const updatePurchaseOrder = async (purchase_orderId, data, tenant_id) => {
  const fieldMap = {
    ...purchase_orderFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await purchase_orderModel.updatePurchaseOrders(
      purchase_orderId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("PurchaseOrder not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("purchase_order:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update purchase_order", 404);
  }
};

// Delete PurchaseOrder
const deletePurchaseOrderByTenantIdAndPurchaseOrderId = async (
  tenantId,
  purchase_orderId
) => {
  try {
    const affectedRows =
      await purchase_orderModel.deletePurchaseOrdersByTenantAndPurchaseOrdersId(
        tenantId,
        purchase_orderId
      );
    if (affectedRows === 0) {
      throw new CustomError("PurchaseOrder not found.", 404);
    }

    await invalidateCacheByPattern("purchase_order:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete purchase_order: ${error.message}`,
      404
    );
  }
};

module.exports = {
  createPurchaseOrder,
  getAllPurchaseOrdersByTenantId,
  getPurchaseOrderByTenantIdAndPurchaseOrderId,
  updatePurchaseOrder,
  deletePurchaseOrderByTenantIdAndPurchaseOrderId,
};
