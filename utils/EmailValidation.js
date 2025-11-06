// utils/checkEmailConflicts.js
const pool = require("../config/db");
const { CustomError } = require("../middlewares/CustomeError");


async function checkEmailConflicts(email, tenant_id, clinic_id, currentTable = null, currentId = null) {
  return
  const tables = ["superuser","clinic", "dentist", "patient", "supplier", "reception"];

  for (const table of tables) {
    const idField = `${table}_id`;
    let query;
    const values = [email, tenant_id];

    if (table === "patient") {
      query = `
        SELECT p.patient_id AS id
        FROM patient p
        JOIN patient_clinic pc ON p.patient_id = pc.patient_id
        WHERE p.email = ? AND p.tenant_id = ? AND pc.clinic_id = ?
      `;
      values.push(clinic_id);
    } else if (["clinic", "dentist"].includes(table)) {
      query = `
        SELECT ${idField} AS id
        FROM ${table}
        WHERE email = ? AND tenant_id = ? AND clinic_id = ?
      `;
      values.push(clinic_id);
    } else {
      query = `
        SELECT ${idField} AS id
        FROM ${table}
        WHERE email = ? AND tenant_id = ?
      `;
    }

    if (currentTable === table && currentId) {
      query += table === "patient" ? ` AND p.${idField} != ?` : ` AND ${idField} != ?`;
      values.push(currentId);
    }

    const [rows] = await pool.query(query, values);
    if (rows.length > 0) {
      const err = new CustomError(`Email conflict detected in table: ${table}`, 409);
      console.log("Throwing CustomError:", err); // debug
      throw err;
    }
  }
}

module.exports = { checkEmailConflicts };
