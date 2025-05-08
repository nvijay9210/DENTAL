const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");

/**
 * Check if a phone number exists in a table for create operation
 */
const checkPhoneNumberExists = async (table, phone_number, field) => {
  const conn = await pool.getConnection();
  try {
    const [phoneResult] = await conn.query(
      `SELECT 1 FROM ${table} WHERE phone_number = ? LIMIT 1`,
      [phone_number]
    );
    const [alternateResult] = await conn.query(
      `SELECT 1 FROM ${table} WHERE alternate_phone_number = ? LIMIT 1`,
      [phone_number]
    );

    if (phoneResult.length > 0 || alternateResult.length > 0) {
      throw new CustomError(`${field} Already Exists`, 409);
    }

    return true;
  } catch (err) {
    console.trace(err);
    throw new CustomError(err.message, 404);
  } finally {
    conn.release();
  }
};

/**
 * Check if a phone number exists in a table for update operation (excluding current record)
 */
const checkPhoneNumberExistsWithId = async (table, idColumn, phone_number, field, id) => {
  const conn = await pool.getConnection();
  try {
    const [phoneResult] = await conn.query(
      `SELECT 1 FROM ${table} WHERE phone_number = ? AND ${idColumn} != ? LIMIT 1`,
      [phone_number, id]
    );
    const [alternateResult] = await conn.query(
      `SELECT 1 FROM ${table} WHERE alternate_phone_number = ? AND ${idColumn} != ? LIMIT 1`,
      [phone_number, id]
    );

    if (phoneResult.length > 0 || alternateResult.length > 0) {
      throw new CustomError(`${field} Already Exists`, 409);
    }

    return true;
  } catch (err) {
    console.trace(err);
    throw new CustomError(err.message, 404);
  } finally {
    conn.release();
  }
};

const checkIfIdExists = async (table, field, value) => {
  const conn = await pool.getConnection();
  try {
    // Sanitize table name to prevent SQL injection
    const allowedTables = ['patient', 'dentist', 'clinic', 'tenant','appointment','treatment','prescription']; // Add your actual table names here
    if (!allowedTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    // Query using proper placeholder for column name and value
    const [result] = await conn.query(
      `SELECT 1 FROM ?? WHERE ?? = ? LIMIT 1`,
      [table, field, value]
    );

    if (result.length === 0) {
      throw new CustomError(`${field} does not exist`, 404);
    }

    return true;
  } catch (err) {
    console.error(err);
    throw new CustomError(`Database error: ${err.message}`, 500);
  } finally {
    conn.release();
  }
};

const checkIfExists = async (table, field, value,tenantId) => {
  const conn = await pool.getConnection();
  try {
    // Sanitize table name to prevent SQL injection
    const allowedTables = ['patient', 'dentist', 'clinic', 'tenant','appointment','treatment','prescription']; // Add your actual table names here
    if (!allowedTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    // Query using proper placeholder for column name and value
    const [result] = await conn.query(
      `SELECT 1 FROM ?? WHERE ?? = ? AND tenant_id = ? LIMIT 1`,
      [table, field, value, tenantId]
    );
    

     return result.length>0 ? true : false

  } catch (err) {
    console.error(err);
    throw new CustomError(`Database error: ${err.message}`, 500);
  } finally {
    conn.release();
  }
};

const checkIfExistsWithoutId = async (table, field, value, excludeField, excludeValue, tenantId) => {
  const conn = await pool.getConnection();
  try {
    // Sanitize table name to prevent SQL injection
    const allowedTables = ['patient', 'dentist', 'clinic', 'tenant','appointment','treatment','prescription']; // Add your actual table names here
    if (!allowedTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    // Query using proper placeholder for column name and value
    const [result] = await conn.query(
      `SELECT 1 FROM ?? WHERE ?? = ? AND ?? != ? AND tenant_id = ? LIMIT 1`,
      [table, field, value, excludeField, excludeValue, tenantId]
    );
    

     return result.length>0 ? true : false

  } catch (err) {
    console.error(err);
    throw new CustomError(`Database error: ${err.message}`, 500);
  } finally {
    conn.release();
  }
};

module.exports = {
  checkPhoneNumberExists,
  checkPhoneNumberExistsWithId,
  checkIfIdExists,
  checkIfExists,
  checkIfExistsWithoutId
};
