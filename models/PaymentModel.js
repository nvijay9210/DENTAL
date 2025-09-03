const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");
const record = require("../query/Records");

const TABLE = "payment";

// Create Payment
const createPayment = async (conn, table, columns, values) => {
  try {
    const payment = await record.createRecord(table, columns, values, conn);

    return payment;
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
};

// Get all payments by tenant ID with pagination
const getAllPaymentsByTenantId = async (tenantId, limit, offset) => {
  try {
    return await record.getAllRecords(
      "payment",
      "tenant_id",
      tenantId,
      limit,
      offset
    );
  } catch (error) {
    console.error("Error fetching payments:", error);
    throw error;
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
    throw error;
  }
};

const getPaymentByTenantAndAppointmentId = async (
  tenant_id,
  appointment_id
) => {
  const query = `SELECT * FROM payment WHERE tenant_id = ? AND appointment_id=?`;
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(query, [tenant_id, appointment_id]);
    return rows;
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

    return await record.updateRecord(
      TABLE,
      columns,
      values,
      conditionColumn,
      conditionValue
    );
  } catch (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
};

// Delete payment
const deletePaymentByTenantAndPaymentId = async (tenant_id, payment_id) => {
  try {
    const conditionColumn = ["tenant_id", "payment_id"];
    const conditionValue = [tenant_id, payment_id];

    const result = await record.deleteRecord(
      TABLE,
      conditionColumn,
      conditionValue
    );
    return result.affectedRows;
  } catch (error) {
    console.error("Error deleting payment:", error);
    throw error;
  }
};

const getallPaymentSummaryByAppointment = async (tenant_id, appointment_id,connection=null) => {
  const query = `
    SELECT 
      p.appointment_id,
      p.patient_id,
      p.dentist_id,
      p.tenant_id,
      p.clinic_id,

      -- ✅ Fetch both fees from appointment
      COALESCE(a.consultation_fee, 0.00) AS consultation_fee,
      COALESCE(a.min_booking_fee, 0.00) AS min_booking_fee,

      -- ✅ Total amount actually paid
      COALESCE(SUM(p.amount), 0.00) AS total_paid,

      -- ✅ Total discount applied (should be one-time)
      COALESCE(SUM(p.discount_applied), 0.00) AS total_discount,

      -- ✅ Treatment base cost
      COALESCE(MAX(t.cost), 0.00) AS total_base_amount,

      -- ✅ Payment metadata
      COUNT(*) AS payment_count,
      GROUP_CONCAT(DISTINCT p.mode_of_payment ORDER BY p.mode_of_payment) AS payment_modes,
      GROUP_CONCAT(DISTINCT p.payment_status ORDER BY p.payment_status) AS payment_statuses,
      MIN(p.payment_date) AS first_payment_date,
      MAX(p.payment_date) AS last_payment_date,
      GROUP_CONCAT(p.receipt_number) AS receipt_numbers,
      MAX(p.payment_verified) AS any_payment_verified,
      GROUP_CONCAT(DISTINCT p.payment_source) AS payment_sources

    FROM payment p
    LEFT JOIN treatment t ON p.appointment_id = t.appointment_id AND p.tenant_id = t.tenant_id
    LEFT JOIN appointment a ON a.appointment_id = p.appointment_id AND a.tenant_id = p.tenant_id
    WHERE p.tenant_id = ? AND p.appointment_id = ?
    GROUP BY 
      p.appointment_id, 
      p.patient_id, 
      p.dentist_id, 
      p.tenant_id, 
      p.clinic_id
  `;

  const conn = connection || await pool.getConnection();

  try {
    const [rows] = await conn.query(query, [tenant_id, appointment_id]);

    const summary = rows?.[0];

    if (!summary) {
      // ✅ Return default empty summary if no payments yet
      return {
        appointment_id,
        patient_id: null,
        dentist_id: null,
        tenant_id,
        clinic_id: null,
        total_base_amount: 0.0,
        total_discount: 0.0,
        consultation_fee: 0.0,
        min_booking_fee: 0.0,
        total_payable: 0.0,
        total_paid: 0.0,
        balance_remaining: 0.0,
        payment_count: 0,
        payment_modes: null,
        payment_statuses: null,
        first_payment_date: null,
        last_payment_date: null,
        receipt_numbers: null,
        any_payment_verified: null,
        payment_sources: null,
      };
    }

    // ✅ Parse values safely
    const baseAmount = parseFloat(summary.total_base_amount) || 0.0;
    const discount = parseFloat(summary.total_discount) || 0.0;
    const consultationFee = parseFloat(summary.consultation_fee) || 0.0;
    const minBookingFee = parseFloat(summary.min_booking_fee) || 0.0;

    // ✅ Apply consultation_fee and min_booking_fee only once per appointment
    const totalPayable = Math.max(
      0,
      baseAmount  + consultationFee
    );

    // ✅ Amount already paid
    const totalPaid = (parseFloat(summary.total_paid) || 0.0) + discount;

    console.log(totalPayable,totalPaid)

    // ✅ Remaining balance
    const balanceRemaining = Math.max(0, totalPayable - totalPaid);

    return {
      ...summary,
      total_base_amount: parseFloat(baseAmount.toFixed(2)),
      total_discount: parseFloat(discount.toFixed(2)),
      consultation_fee: parseFloat(consultationFee.toFixed(2)),
      min_booking_fee: parseFloat(minBookingFee.toFixed(2)),
      total_payable: parseFloat(totalPayable.toFixed(2)),
      total_paid: parseFloat(totalPaid.toFixed(2)),
      balance_remaining: parseFloat(balanceRemaining.toFixed(2)),
    };
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
  getallPaymentSummaryByAppointment,
};
