// utils/checkPhoneConflicts.js
const pool = require("../config/db");

async function checkPhoneConflicts(
  phone,
  tenant_id,
  clinic_id,
  alternatePhone = null,
  currentTable = null,
  currentId = null
) {
  const tables = ["clinic", "dentist", "patient", "supplier", "reception"];

  for (const table of tables) {
    const idField = `${table}_id`;
    const values = [phone, alternatePhone ?? phone, tenant_id];

    let query;

    if (table === "patient") {
      // Patient joins patient_clinic to filter by clinic
      query = `
        SELECT p.patient_id
        FROM patient p
        JOIN patient_clinic pc ON p.patient_id = pc.patient_id
        WHERE (p.phone_number = ? OR p.alternate_phone_number = ? OR p.emergency_contact_number = ?)
          AND p.tenant_id = ?
          AND pc.clinic_id = ?
      `;
      values.push(phone, clinic_id); // last phone for emergency_contact, then clinic_id
    } else {
      // Only include clinic_id if table actually has it
      if (["clinic", "dentist"].includes(table)) {
        query = `
          SELECT ${idField} 
          FROM ${table}
          WHERE (phone_number = ? OR alternate_phone_number = ?)
            AND tenant_id = ?
            AND clinic_id = ?
        `;
        values.push(clinic_id);
      } else {
        query = `
          SELECT ${idField} 
          FROM ${table}
          WHERE (phone_number = ? OR alternate_phone_number = ?)
            AND tenant_id = ?
        `;
      }
    }

    // Exclude current record if updating
    if (currentTable === "patient" && currentTable === table && currentId) {
      query += ` AND p.${idField} != ?`;
      values.push(currentId);
    } else if (currentTable === table && currentId) {
      query += ` AND ${idField} != ?`;
      values.push(currentId);
    }

    const [rows] = await pool.query(query, values);

    if (rows.length > 0) {
      throw new Error(`Phone number conflict detected in table: ${table}`);
    }
  }
}

module.exports = { checkPhoneConflicts };
