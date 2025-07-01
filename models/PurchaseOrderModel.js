const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "purchase_orders";

// Create PurchaseOrders
const createPurchaseOrders = async (table,columns, values) => {
  try {
    const purchase_orders = await record.createRecord(table, columns, values);
  
    return purchase_orders.insertId;
  } catch (error) {
    console.error("Error creating purchase_orders:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all purchase_orderss by tenant ID with pagination
const getAllPurchaseOrderssByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords("purchase_orders", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching purchase_orderss:", error);
    throw new CustomError("Error fetching purchase_orderss.", 500);
  }
};

// Get purchase_orders by tenant ID and purchase_orders ID
const getPurchaseOrdersByTenantAndPurchaseOrdersId = async (tenant_id, purchase_order_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "purchase_order_id",
      purchase_order_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching purchase_orders:", error);
    throw new CustomError("Error fetching purchase_orders.", 500);
  }
};

const getAllPurchaseOrdersByTenantIdAndSupplierId = async (tenantId,supplierId, limit, offset) => {
  const query1 = `SELECT * FROM purchase_orders  WHERE tenant_id = ? AND supplier_id = ? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM purchase_orders  WHERE tenant_id = ? AND supplier_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      supplierId,
      limit,
      offset,
    ]);
    const [counts] = await conn.query(query2, [tenantId, supplierId]);
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

// Update purchase_orders
const updatePurchaseOrders = async (purchase_order_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "purchase_order_id"];
    const conditionValue = [tenant_id, purchase_order_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating purchase_orders:", error);
    throw new CustomError("Error updating purchase_orders.", 500);
  }
};

// Delete purchase_orders
const deletePurchaseOrdersByTenantAndPurchaseOrdersId = async (tenant_id, purchase_order_id) => {
  try {
    const conditionColumn = ["tenant_id", "purchase_order_id"];
    const conditionValue = [tenant_id, purchase_order_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting purchase_orders:", error);
    throw new CustomError("Error deleting purchase_orders.", 500);
  }
};



module.exports = {
  createPurchaseOrders,
  getAllPurchaseOrderssByTenantId,
  getPurchaseOrdersByTenantAndPurchaseOrdersId,
  updatePurchaseOrders,
  deletePurchaseOrdersByTenantAndPurchaseOrdersId,
  getAllPurchaseOrdersByTenantIdAndSupplierId
};
