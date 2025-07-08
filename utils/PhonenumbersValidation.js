// utils/checkPhoneConflicts.js
const pool = require("../config/db");

async function checkPhoneConflicts(phone, alternatePhone = null, currentTable = null, currentId = null) {
  const tables = ['clinic', 'dentist', 'patient', 'supplier', 'reception'];

  for (const table of tables) {
    const idField = `${table}_id`;
    const values = [phone, alternatePhone ?? phone];
    let query;

    if (table === 'patient') {
      // Include emergency_contact_number for patient table
      query = `
        SELECT ${idField} FROM ${table} 
        WHERE (phone_number = ? OR alternate_phone_number = ? OR emergency_contact_number = ?)
      `;
      values.push(phone); // Check `phone` against emergency_contact_number
    } else {
      query = `
        SELECT ${idField} FROM ${table} 
        WHERE (phone_number = ? OR alternate_phone_number = ?)
      `;
    }

    // Exclude current record if updating
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
