const pool = require('../config/db');

/**
 * Checks if the given email exists in any table, excluding one specific record.
 *
 * @param {string} email - Email to check
 * @param {string|null} tableName - Table to exclude from check (e.g., 'dentist')
 * @param {number|null} recordId - ID in that table to exclude
 */
async function checkEmailConflicts(email, tableName = null, recordId = null) {
  const tables = ['clinic', 'dentist', 'patient', 'supplier', 'reception'];
  const queries = [];

  for (const table of tables) {
    const idField = `${table}_id`;

    let query = `
      SELECT '${table}' AS source, ${idField} AS id
      FROM ${table}
      WHERE email = ?
    `;
    const params = [email];

    // Only skip the given ID in the correct table
    if (table === tableName && recordId !== null) {
      query += ` AND ${idField} != ?`;
      params.push(recordId);
    }

    queries.push(pool.query(query, params));
  }

  const results = await Promise.all(queries);
  const conflicts = results.flatMap(r => r[0]);

  if (conflicts.length > 0) {
    const sources = [...new Set(conflicts.map(c => c.source))].join(', ');
    throw new Error(`❌ Email already exists in: ${sources}`);
  }
}

module.exports = {
  checkEmailConflicts,
};
