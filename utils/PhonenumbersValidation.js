// utils/checkPhoneConflicts.js
const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");


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
    let query;
    let values;

    if (table === "patient") {
      query = `
        SELECT p.patient_id AS id
        FROM patient p
        JOIN patient_clinic pc ON p.patient_id = pc.patient_id
        WHERE (p.phone_number = ? OR p.alternate_phone_number = ? OR p.emergency_contact_number = ?)
          AND p.tenant_id = ?
          AND pc.clinic_id = ?
      `;
      values = [phone, alternatePhone ?? phone, phone, tenant_id, clinic_id];
    } else if (["clinic", "dentist"].includes(table)) {
      query = `
        SELECT ${idField} AS id
        FROM ${table}
        WHERE (phone_number = ? OR alternate_phone_number = ?)
          AND tenant_id = ? AND clinic_id = ?
      `;
      values = [phone, alternatePhone ?? phone, tenant_id, clinic_id];
    } else {
      query = `
        SELECT ${idField} AS id
        FROM ${table}
        WHERE (phone_number = ? OR alternate_phone_number = ?)
          AND tenant_id = ?
      `;
      values = [phone, alternatePhone ?? phone, tenant_id];
    }

    // Exclude self during update
    if (currentTable === table && currentId) {
      query += table === "patient" ? ` AND p.${idField} != ?` : ` AND ${idField} != ?`;
      values.push(currentId);
    }

    const [rows] = await pool.query(query, values);
    if (rows.length > 0) {
      throw new CustomError(`Phone number conflict detected in table: ${table}`, 409);
    }
  }
}


module.exports = { checkPhoneConflicts };
