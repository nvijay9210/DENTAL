const pool = require('../config/db');

/**
 * Checks if the given email exists in any table, excluding one specific record.
 *
 * @param {string} email - Email to check
 * @param {string|null} tableName - Table to exclude from check (e.g., 'dentist')
 * @param {number|null} recordId - ID in that table to exclude
 */
async function checkEmailConflicts(email, tenant_id, clinic_id, tableName = null, recordId = null) {
  const tables = ['clinic', 'dentist', 'patient', 'supplier', 'reception'];
  const queries = [];

  for (const table of tables) {
    let query = '';
    const params = [email, tenant_id];

    if (table === 'patient') {
      // patient joins patient_clinic to filter by clinic_id
      query = `
        SELECT 'patient' AS source, p.patient_id AS id
        FROM patient p
        JOIN patient_clinic pc ON p.patient_id = pc.patient_id
        WHERE p.email = ? AND p.tenant_id = ? AND pc.clinic_id = ?
      `;
      params.push(clinic_id);

      if (tableName === 'patient' && recordId !== null) {
        query += ` AND p.patient_id != ?`;
        params.push(recordId);
      }
    } else {
      const idField = `${table}_id`;

      // Only include clinic_id filter if table has it (clinic, dentist)
      if (['clinic', 'dentist'].includes(table)) {
        query = `
          SELECT '${table}' AS source, ${idField} AS id
          FROM ${table}
          WHERE email = ? AND tenant_id = ? AND clinic_id = ?
        `;
        params.push(clinic_id);
      } else {
        query = `
          SELECT '${table}' AS source, ${idField} AS id
          FROM ${table}
          WHERE email = ? AND tenant_id = ?
        `;
      }

      if (table === tableName && recordId !== null) {
        query += ` AND ${idField} != ?`;
        params.push(recordId);
      }
    }

    queries.push(pool.query(query, params));
  }

  const results = await Promise.all(queries);
  const conflicts = results.flatMap(r => r[0]);

  if (conflicts.length > 0) {
    const sources = [...new Set(conflicts.map(c => c.source))].join(', ');
    throw new Error(`Email conflict detected in: ${sources}`);
  }
}



module.exports = {
  checkEmailConflicts,
};
