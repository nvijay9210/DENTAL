const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "payment";

// Create Payment
const createPayment = async (conn,table,columns, values) => {
  try {
    const payment = await record.createRecord(table, columns, values,conn);
   
    return payment;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error
  }
};

// Get all payments by tenant ID with pagination
const getAllPaymentsByTenantId = async (tenantId, limit, offset) => {
  try {
    return await record.getAllRecords("payment", "tenant_id", tenantId, limit, offset);
  } catch (error) {
    console.error("Error fetching payments:", error);
    throw error
  }
};

// Get payment by tenant ID and payment ID
const getPaymentByTenantAndPaymentId = async (tenant_id, payment_id) => {
  try {
    const [rows] = await record.getRecordByIdAndTenantId(
      TABLE,
      "tenant_id",
      tenant_id,
      "payment_id",
      payment_id
    );
    return rows?.[0] ?? null;
  } catch (error) {
    console.error("Error fetching payment:", error);
    throw error
  }
};

const getPaymentByTenantAndAppointmentId = async (tenant_id, appointment_id) => {
  const query = `SELECT * FROM payment WHERE tenant_id = ? AND appointment_id=?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenant_id, appointment_id]);
    return rows?.[0];
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed");
  } finally {
    conn.release();
  }
};

// Update payment
const updatePayment = async (payment_id, columns, values, tenant_id) => {
  try {
    const conditionColumn = ["tenant_id", "payment_id"];
    const conditionValue = [tenant_id, payment_id];

    return await record.updateRecord(TABLE, columns, values, conditionColumn, conditionValue);
  } catch (error) {
    console.error("Error updating payment:", error);
    throw error
  }
};

// Delete payment
const deletePaymentByTenantAndPaymentId = async (tenant_id, payment_id) => {
  try {
    const conditionColumn = ["tenant_id", "payment_id"];
    const conditionValue = [tenant_id, payment_id];

    const result = await record.deleteRecord(TABLE, conditionColumn, conditionValue);
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting payment:", error);
    throw error
  }
};



module.exports = {
  createPayment,
  getAllPaymentsByTenantId,
  getPaymentByTenantAndPaymentId,
  updatePayment,
  deletePaymentByTenantAndPaymentId,
  getPaymentByTenantAndAppointmentId
};
