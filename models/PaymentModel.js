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

const getallPaymentSummaryByAppointment = async (tenant_id, appointment_id) => {
  const query = `
    SELECT 
      appointment_id,
      patient_id,
      dentist_id,
      tenant_id,
      clinic_id,
      
      COALESCE(SUM(amount), 0.00) AS total_base_amount,
      COALESCE(SUM(discount_applied), 0.00) AS total_discount,
      COALESCE(SUM(final_amount), 0.00) AS total_final_amount,
      
      COUNT(*) AS payment_count,
      
      GROUP_CONCAT(DISTINCT mode_of_payment ORDER BY mode_of_payment) AS payment_modes,
      GROUP_CONCAT(DISTINCT payment_status ORDER BY payment_status) AS payment_statuses,
      
      MIN(payment_date) AS first_payment_date,
      MAX(payment_date) AS last_payment_date,
      
      GROUP_CONCAT(receipt_number) AS receipt_numbers,
      MAX(payment_verified) AS any_payment_verified,
      GROUP_CONCAT(DISTINCT payment_source) AS payment_sources
      
    FROM payment 
    WHERE tenant_id = ? AND appointment_id = ?
    GROUP BY appointment_id, patient_id, dentist_id, tenant_id, clinic_id
  `;

  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(query, [tenant_id, appointment_id]);

    // Return first row (only one appointment) or undefined
    return rows?.[0] || null;
  } catch (error) {
    console.error("Error fetching payment summary:", error);
    throw new Error("Failed to retrieve payment summary for appointment");
  } finally {
    conn.release();
  }
};



module.exports = {
  createPayment,
  getAllPaymentsByTenantId,
  getPaymentByTenantAndPaymentId,
  updatePayment,
  deletePaymentByTenantAndPaymentId,
  getPaymentByTenantAndAppointmentId,
  getallPaymentSummaryByAppointment
};
