const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");

const getPhonenumberAndAlternateNumberBytenantIdAndTableId = async (
  table,
  tenantId,
  id
) => {
  const tableField = `${table}_id`;

  // Validate table name to prevent SQL injection
  const allowedTables = ["clinic", "dentist", "patient", "hospital"];
  if (!allowedTables.includes(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }

  const query = `
    SELECT phone_number, alternate_phone_number 
    FROM ?? 
    WHERE tenant_id = ? AND ?? = ?
    LIMIT 1
  `;

  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(query, [table, tenantId, tableField, id]);

    if (rows.length === 0) {
      throw new Error(`${table} record not found`);
    }

    return rows[0]; // { phone_number, alternate_phone_number }
  } catch (error) {
    console.error(`Error fetching phone data from ${table}:`, error.message);
    throw new Error(`Failed to retrieve phone numbers for ${table}`);
  } finally {
    conn.release();
  }
};

/**
 * Checks if a phone number already exists in ANY table under the same tenant
 */
const checkGlobalPhoneNumberExists = async (phoneNumber, tenantId) => {
  const conn = await pool.getConnection();
  try {
    const tables = ["clinic", "dentist", "patient", "clinic"];

    for (const table of tables) {
      const [rows] = await conn.query(
        `SELECT 1 FROM ${table} WHERE phone_number = ? AND tenant_id = ? LIMIT 1`,
        [phoneNumber, tenantId]
      );

      if (rows.length > 0) {
        throw new CustomError(`Phone number already exists in ${table}`, 409);
      }
    }

    return true;
  } catch (err) {
    console.error("Global phone check error:", err.message);
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Checks if a phone number already exists in ANY table under the same tenant, excluding current record
 */
const checkGlobalPhoneNumberExistsWithId = async (
  table,
  phoneNumber,
  id,
  tenantId
) => {
  const conn = await pool.getConnection();
  try {
    const idColumn = `${table}_id`;
    const tables = ["clinic", "dentist", "patient"];

    for (const targetTable of tables) {
      const [rows] = await conn.query(
        `SELECT 1 FROM ${targetTable} WHERE phone_number = ? AND tenant_id = ? AND ${idColumn} != ? LIMIT 1`,
        [phoneNumber, tenantId, id]
      );

      if (rows.length > 0) {
        throw new CustomError(
          `Phone number already exists in ${targetTable}`,
          409
        );
      }
    }

    return true;
  } catch (err) {
    console.error("Global phone check with ID error:", err.message);
    throw err;
  } finally {
    conn.release();
  }
};

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
    throw new CustomError(`Database error: ${err.message}`, 404);
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
      "reminder",
      "payment"
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
    throw new CustomError(`Database error: ${err.message}`, 500);
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
    // Sanitize table name to prevent SQL injection
    // const allowedTables = [
    //   "patient",
    //   "dentist",
    //   "clinic",
    //   "tenant",
    //   "appointment",
    //   "treatment",
    //   "prescription",
    //   "statustype",
    //   "statustypesub",
    // ]; // Add your actual table names here
    // if (!allowedTables.includes(table)) {
    //   throw new Error(`Invalid table name: ${table}`);
    // }

    // Query using proper placeholder for column name and value
    const [result] = await conn.query(
      `SELECT 1 FROM ?? WHERE ?? = ? AND ?? != ? AND tenant_id = ? LIMIT 1`,
      [table, field, value, excludeField, excludeValue, tenantId]
    );

    return result.length > 0 ? true : false;
  } catch (err) {
    console.error(err);
    throw new CustomError(`Database error: ${err.message}`, 500);
  } finally {
    conn.release();
  }
};

module.exports = {
  checkGlobalPhoneNumberExists,
  checkGlobalPhoneNumberExistsWithId,
  checkIfIdExists,
  checkIfExists,
  checkIfExistsWithoutId,
  getPhonenumberAndAlternateNumberBytenantIdAndTableId,
};
