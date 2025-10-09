const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");

// utils/validation.js or helpers/db.js
const ALLOWED_TABLES = new Set([
  "tenant",
  "clinic",
  "dentist",
  "patient",
  "appointment",
  "treatment",
  "prescription",
  "asset",
  "expense",
  "supplier",
  "supplier_products",
  "purchase_orders",
  "supplier_payments",
  "supplier_reviews",
  "appointment_reschedules",
  "reception",
  "toothdetails",
  "loginhistory",
  "useractivity",
  "notifications",
  "notificationrecipients",
  "appointment_stats",
  "statustype",
  "statustypesub",
  "reminder",
  "payment",
  "patient_clinic"
]);

const ALLOWED_FIELDS = {
  tenant: ["tenant_id"],
  clinic: ["clinic_id"],
  dentist: ["dentist_id"],
  patient: ["patient_id"],
  appointment: ["appointment_id"],
  treatment: ["treatment_id"],
  prescription: ["prescription_id"],
  asset: ["asset_id"],
  expense: ["expense_id"],
  supplier: ["supplier_id"],
  supplier_products: ["supplier_product_id"],
  purchase_orders: ["purchase_order_id"],
  supplier_payments: ["supplier_payment_id"],
  supplier_reviews: ["supplier_review_id"],
  appointment_reschedules: ["rescheduled_id"],
  reception: ["reception_id"],
  toothdetails: ["toothdetails_id"],
  loginhistory: ["loginhistory_id"],
  useractivity: ["useractivity_id"],
  notifications: ["notification_id"],
  notificationrecipients: ["notification_recipient_id"],
  appointment_stats: ["appointment_stats_id"],
  statustype: ["status_type_id"],
  statustypesub: ["status_type_sub_id"],
  reminder: ["reminder_id"],
  payment: ["payment_id"],
  patient_clinic: ["patient_clinic_id"]
};

const validateTableAndField = (table, field) => {
  if (!table || !field) {
    throw new CustomError("Table and field are required for validation", 400);
  }

  if (!ALLOWED_TABLES.has(table)) {
    throw new CustomError(`Invalid table name: ${table}`, 400);
  }

  const allowedFields = ALLOWED_FIELDS[table];
  if (!allowedFields || !allowedFields.includes(field)) {
    throw new CustomError(`Invalid field '${field}' for table '${table}'`, 400);
  }
};

module.exports = { validateTableAndField };


const checkIfIdExists = async (table, field, value) => {

  const conn = await pool.getConnection();
  try {
    // Query using proper placeholder for column name and value
    const [result] = await conn.query(`SELECT 1 FROM ?? WHERE ?? = ? LIMIT 1`, [
      table,
      field,
      value,
    ]);

    if (result.length === 0) {
      throw new CustomError(`${field} does not exist`, 404);
    }

    return true;
  } catch (err) {
    console.error(err);
    throw new CustomError(`Error: ${err.message}`, 404);
  } finally {
    conn.release();
  }
};

const checkIfExists = async (table, field, value, tenantId) => {
  const conn = await pool.getConnection();
  try {
    // Sanitize table name to prevent SQL injection
    const allowedTables = [
      "patient",
      "dentist",
      "clinic",
      "tenant",
      "appointment",
      "treatment",
      "prescription",
      "statustype",
      "statustypesub",
      "asset",
      "expense",
      "supplier",
      "superuser",
      "purchase_orders",
      "supplier_products",
      "supplier_payments",
      "supplier_reviews",
      "reminder",
      "payment",
      "reception",
      "notifications",
      "toothdetails",
      "login_history",
      "user_activity"
    ]; // Add your actual table names here
    if (!allowedTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    // Query using proper placeholder for column name and value
    const [result] = await conn.query(
      `SELECT 1 FROM ?? WHERE ?? = ? AND tenant_id = ? LIMIT 1`,
      [table, field, value, tenantId]
    );

    return result.length > 0 ? true : false;
  } catch (err) {
    console.error(err);
    throw new CustomError(`Error: ${err.message}`, 500);
  } finally {
    conn.release();
  }
};

const checkExists = async (table, field, value, tenantScoped = false, tenantId) => {
  if (tenantScoped && !tenantId) {
    throw new CustomError("tenantId required for tenant-scoped check", 400);
  }

  const conn = await pool.getConnection();
  try {
    validateTableAndField(table, field); // Use shared validation

    const condition = tenantScoped
      ? `WHERE ?? = ? AND tenant_id = ?`
      : `WHERE ?? = ?`;

    const params = tenantScoped
      ? [table, field, value, tenantId]
      : [table, field, value];

    const [rows] = await conn.query(
      `SELECT 1 FROM ?? ${condition} LIMIT 1`,
      params
    );

    return rows.length > 0;
  } catch (err) {
    // handle error
  } finally {
    conn.release();
  }
};

const checkIfExistsWithoutId = async (
  table,
  field,
  value,
  excludeField,
  excludeValue,
  tenantId
) => {
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      `SELECT 1 FROM ?? WHERE ?? = ? AND ?? != ? AND tenant_id = ? LIMIT 1`,
      [table, field, value, excludeField, excludeValue, tenantId]
    );

    return result.length > 0 ? true : false;
  } catch (err) {
    console.error(err);
    throw new CustomError(`Error: ${err.message}`, 500);
  } finally {
    conn.release();
  }
};

module.exports = {
  checkIfIdExists,
  checkIfExists,
  checkExists,
  checkIfExistsWithoutId
};
