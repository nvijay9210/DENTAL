const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "supplier_payments";

// Create SupplierPayments
const createSupplierPayments = async (table,columns, values) => {
  try {
    const supplier_payments = await record.createRecord(table, columns, values);
    return supplier_payments.insertId;
  } catch (error) {
    console.error("Error creating supplier_payments:", error);
    throw new CustomError("Database Operation Failed", 500);
  }
};

// Get all supplier_paymentss by tenant ID with pagination
const getAllSupplierPaymentssByTenantId = async (tenantId, limit, offset) => {
  try {
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) {
      throw new CustomError("Invalid pagination parameters.", 400);
    }
    return await record.getAllRecords("supplier_payments", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching supplier_paymentss:", error);
    throw new CustomError("Error fetching supplier_paymentss.", 500);
  }
};

// Get supplier_payments by tenant ID and supplier_payments ID
const getSupplierPaymentsByTenantAndSupplierPaymentsId = async (tenant_id, supplier_payments_id) => {
  try {
    const rows = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "supplier_payment_id",
      supplier_payments_id
    );
    return rows;
  } catch (error) {
    console.error("Error fetching supplier_payments:", error);
    throw new CustomError("Error fetching supplier_payments.", 500);
  }
};
const getSupplierPaymentsByTenantAndPurchaseOrderId = async (tenant_id, purchase_order_id) => {
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
    console.error("Error fetching supplier_payments by purchase_order_id:", error);
    throw new CustomError("Error fetching supplier_payments by purchase_order_id.", 500);
  }
};

// Update supplier_payments
const updateSupplierPayments = async (supplier_payments_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "supplier_payment_id"];
    const conditionValue = [tenant_id, supplier_payments_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating supplier_payments:", error);
    throw new CustomError("Error updating supplier_payments.", 500);
  }
};

// Delete supplier_payments
const deleteSupplierPaymentsByTenantAndSupplierPaymentsId = async (tenant_id, supplier_payments_id) => {
  try {
    const conditionColumn = ["tenant_id", "supplier_payment_id"];
    const conditionValue = [tenant_id, supplier_payments_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting supplier_payments:", error);
    throw new CustomError("Error deleting supplier_payments.", 500);
  }
};



module.exports = {
  createSupplierPayments,
  getAllSupplierPaymentssByTenantId,
  getSupplierPaymentsByTenantAndSupplierPaymentsId,
  updateSupplierPayments,
  deleteSupplierPaymentsByTenantAndSupplierPaymentsId,
  getSupplierPaymentsByTenantAndPurchaseOrderId
};
