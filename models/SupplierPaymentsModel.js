const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");
const { formatDateOnly } = require("../utils/DateUtils");

const TABLE = "supplier_payments";

// Create SupplierPayments
const createSupplierPayments = async (table, columns, values) => {
  try {
    const supplier_payments = await record.createRecord(table, columns, values);
    return supplier_payments.insertId;
  } catch (error) {
    console.error("Error creating supplier_payments:", error);
    throw error
  }
};

async function allocateSupplierPaymentFIFO(paymentData) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Fetch unpaid purchase orders for this supplier (FIFO)
    const [orders] = await conn.query(
      `SELECT purchase_order_id, total_amount, 
              IFNULL(SUM(sp.paid_amount), 0) AS already_paid
       FROM purchase_orders po
       LEFT JOIN supplier_payments sp 
         ON po.purchase_order_id = sp.purchase_order_id
       WHERE po.supplier_id = ? 
         AND po.clinic_id = ? 
         AND po.tenant_id = ?
         AND po.status != 'cancelled'
       GROUP BY po.purchase_order_id
       HAVING total_amount > already_paid
       ORDER BY po.order_date ASC, po.purchase_order_id ASC`,
      [paymentData.supplier_id, paymentData.clinic_id, paymentData.tenant_id]
    );

    let remainingPayment = paymentAmount;

    for (const order of orders) {
      if (remainingPayment <= 0) break;

      const balanceForOrder = parseFloat(order.total_amount) - parseFloat(order.already_paid);
      const payForThisOrder = Math.min(balanceForOrder, remainingPayment);

      // Insert payment record
      await conn.query(
        `INSERT INTO supplier_payments 
         (tenant_id, clinic_id, supplier_id, purchase_order_id, amount, paid_amount, balance_amount,
          mode_of_payment, receipt_number, bank_name, bank_account_number, bank_ifsc, transaction_id, 
          payment_date,supplier_payment_type, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          paymentData.tenant_id, paymentData.clinic_id, paymentData.supplier_id, order.purchase_order_id,
          paymentData.paymentAmount, // Original amount for tracking
          payForThisOrder,
          balanceForOrder - payForThisOrder,
          formatDateOnly(paymentData.mode_of_payment) || null,
          paymentData.receipt_number || null,
          paymentData.bank_name || null,
          paymentData.bank_account_number || null,
          paymentData.bank_ifsc || null,
          paymentData.transaction_id || null,
          formatDateOnly(paymentData.payment_date) || new Date(),
          paymentData.supplier_payment_type,
          paymentData.created_by || "user"
        ]
      );

      remainingPayment -= payForThisOrder;
    }

    await conn.commit();
    return { success: true, message: "FIFO payment allocation completed" };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// models/supplierPaymentModel.js
const { employeePool } = require("../config/db");

// Get supplier payment by ID + tenant + clinic
async function getSupplierPaymentById(paymentId, tenantId, clinicId) {
  const [rows] = await employeePool.query(
    `SELECT * FROM supplier_payments 
     WHERE supplier_payment_id = ? AND tenant_id = ? AND clinic_id = ?`,
    [paymentId, tenantId, clinicId]
  );
  return rows[0] || null;
}

// Update supplier payment record
async function updateSupplierPayment(paymentId, tenantId, clinicId, data) {
  await employeePool.query(
    `UPDATE supplier_payments
     SET amount = ?, paid_amount = ?, balance_amount = ?, supplier_payment_documents = ?, 
         mode_of_payment = ?, receipt_number = ?, bank_name = ?, bank_account_number = ?, 
         bank_ifsc = ?, transaction_id = ?, payment_date = ?, updated_by = ?, updated_time = NOW()
     WHERE supplier_payment_id = ? AND tenant_id = ? AND clinic_id = ?`,
    [
      data.amount,
      data.paid_amount,
      data.balance_amount,
      data.supplier_payment_documents,
      data.mode_of_payment,
      data.receipt_number,
      data.bank_name,
      data.bank_account_number,
      data.bank_ifsc,
      data.transaction_id,
      data.payment_date,
      data.updated_by,
      paymentId,
      tenantId,
      clinicId
    ]
  );
}

// Get unpaid supplier payment entries FIFO (where balance > 0)
const getUnpaidEntriesFIFO = async (supplier_payment_id) => {
  const query = `
    SELECT * FROM supplier_payments
    WHERE supplier_payment_id = ? AND balance_amount > 0
    ORDER BY created_at ASC
  `;
  const [rows] = await pool.query(query, [supplier_payment_id]);
  return rows;
};

// Update balance on existing unpaid entry
const updateBalanceAmount = async (supplier_payment_id, newBalance) => {
  const query = `
    UPDATE supplier_payments
    SET balance_amount = ?
    WHERE supplier_payment_id = ?
  `;
  await pool.query(query, [newBalance, supplier_payment_id]);
};


// Get all supplier_paymentss by tenant ID with pagination
const getAllSupplierPaymentssByTenantId = async (tenantId, limit, offset) => {
  try {
    if (
      !Number.isInteger(limit) ||
      !Number.isInteger(offset) ||
      limit < 1 ||
      offset < 0
    ) {
      throw error
    }
    return await record.getAllRecords(
      "supplier_payments",
      "tenant_id",
      tenantId,
      limit,
      offset
    );
  } catch (error) {
    console.error("Error fetching supplier_paymentss:", error);
    throw error
  }
};

const getAllSupplierPaymentssByTenantIdAndSupplierId = async (
  tenantId,
  supplierId,
  limit,
  offset
) => {
  const query1 = `SELECT sup.product_name,sup.unit_price,po.quantity,po.order_date,po.delivery_date,sp.* FROM supplier_payments sp JOIN purchase_orders po on po.purchase_order_id=sp.purchase_order_id JOIN supplier_products sup on sup.supplier_product_id=po.supplier_product_id  WHERE sp.tenant_id = ? AND sp.supplier_id = ? limit ? offset ?`;
  const query2 = `SELECT count(*) as total FROM supplier_payments sp JOIN purchase_orders po on po.purchase_order_id=sp.purchase_order_id JOIN supplier_products sup on sup.supplier_product_id=po.supplier_product_id  WHERE sp.tenant_id = ? AND sp.supplier_id = ?`;
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

const getAllUnpaidSupplierPaymentssByTenantIdAndSupplierId = async (
  tenantId,
  supplierId
) => {
  const query1 = `SELECT * FROM supplier_payments WHERE sp.tenant_id = ? AND clinic_id=? AND supplier_id = ? AND balance_amount>0`
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      supplierId,
      limit,
      offset,
    ]);
    return rows
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

const getSupplierPaymentsByTenantAndPurchaseOrderId = async (
  tenantId,
  purchase_order_id,
  limit,
  offset
) => {
  const query1 = `SELECT
    po.*,
     sp.paid_amount,
     sp.balance_amount,
     sp.payment_date,
     sp.supplier_payment_id,
     sp.mode_of_payment,
     sp.receipt_number,
     sp.transaction_id
    FROM
      supplier_payments sp
    JOIN
    purchase_orders po ON po.purchase_order_id = sp.purchase_order_id
    WHERE
      sp.tenant_id = ?
      AND sp.purchase_order_id = ? limit ? offset ?`;
  const query2 = `SELECT
    count(*) as total
    FROM
      supplier_payments sp
    JOIN
    purchase_orders po ON po.purchase_order_id = sp.purchase_order_id
    WHERE
      sp.tenant_id = ?
      AND sp.purchase_order_id = ?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query1, [
      tenantId,
      purchase_order_id,
      limit,
      offset
    ]);
    const [counts] = await conn.query(query2, [tenantId, purchase_order_id]);
    return { data: rows, total: counts[0].total };
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

// Get supplier_payments by tenant ID and supplier_payments ID
const getSupplierPaymentsByTenantAndSupplierPaymentsId = async (
  tenant_id,
  supplier_payments_id
) => {
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
    throw error
  }
};

// const getSupplierPaymentsByTenantAndPurchaseOrderId = async (tenant_id, purchase_order_id) => {
//   try {
//     const rows = await record.getRecordByIdAndTenantId(
//       TABLE,
//       "tenant_id",
//       tenant_id,
//       "purchase_order_id",
//       purchase_order_id
//     );
//     return rows;
//   } catch (error) {
//     console.error("Error fetching supplier_payments by purchase_order_id:", error);
//     throw error
//   }
// };

// const getSupplierPaymentsByTenantAndPurchaseOrderId = async (tenantId,  purchase_order_id,limit,offset) => {
//   const query = `
//     SELECT
//     po.*,
//      sp.paid_amount,
//      sp.balance_amount
//     FROM
//       supplier_payments sp
//     JOIN
//     purchase_orders po ON po.purchase_order_id = sp.purchase_order_id
//     WHERE
//       sp.tenant_id = ?
//       AND sp.purchase_order_id = ?
//   `;
//   const conn = await pool.getConnection();
//   try {
//     const [rows] = await conn.query(query, [tenantId, purchase_order_id]);
//     return rows;
//   } catch (error) {
//     console.error("Error fetching appointment analytics:", error);
//     throw new Error("Database Operation Failed");
//   } finally {
//     conn.release();
//   }
// };

// Update supplier_payments

const updateSupplierPayments = async (
  supplier_payments_id,
  columns,
  values,
  tenant_id
) => {
  try {
    const conditionColumn = ["tenant_id", "supplier_payment_id"];
    const conditionValue = [tenant_id, supplier_payments_id];

    return await record.updateRecord(
      TABLE,
      columns,
      values,
      conditionColumn,
      conditionValue
    );
  } catch (error) {
    console.error("Error updating supplier_payments:", error);
    throw error
  }
};

// Delete supplier_payments
const deleteSupplierPaymentsByTenantAndSupplierPaymentsId = async (
  tenant_id,
  supplier_payments_id
) => {
  try {
    const conditionColumn = ["tenant_id", "supplier_payment_id"];
    const conditionValue = [tenant_id, supplier_payments_id];

    const result = await record.deleteRecord(
      TABLE,
      conditionColumn,
      conditionValue
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting supplier_payments:", error);
    throw error
  }
};

module.exports = {
  createSupplierPayments,
  getAllSupplierPaymentssByTenantId,
  getSupplierPaymentsByTenantAndSupplierPaymentsId,
  updateSupplierPayments,
  deleteSupplierPaymentsByTenantAndSupplierPaymentsId,
  getSupplierPaymentsByTenantAndPurchaseOrderId,
  getAllSupplierPaymentssByTenantIdAndSupplierId,
  getUnpaidEntriesFIFO,
  updateBalanceAmount,
  getAllUnpaidSupplierPaymentssByTenantIdAndSupplierId,
  allocateSupplierPaymentFIFO,
  getSupplierPaymentById,
  updateSupplierPayment
};
