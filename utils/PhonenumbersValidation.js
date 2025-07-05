// utils/checkPhoneConflicts.js
const pool = require("../config/db");

async function checkPhoneConflicts(phone, alternatePhone = null, currentTable = null, currentId = null) {
  const tables = ['clinic', 'dentist', 'patient', 'supplier', 'reception'];

  for (const table of tables) {
    const idField = `${table}_id`;
    let query = `SELECT ${idField} FROM ${table} WHERE (phone_number = ? OR alternate_phone_number = ?)`;
    const values = [phone, alternatePhone ?? phone]; // fallback if alternatePhone is null

    // Skip same record during update
    if (currentTable === table && currentId) {
      query += ` AND ${idField} != ?`;
      values.push(currentId);
    }

    const [rows] = await pool.query(query, values);
    if (rows.length > 0) {
      throw new Error(`Phone number already exists in: ${table}`);
    }
  }
}

module.exports = { checkPhoneConflicts };
