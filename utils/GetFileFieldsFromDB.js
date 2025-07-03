const db = require("../config/db");

/**
 * Dynamically fetch file field values from any table
 *
 * @param {string} tableName - The DB table (e.g. "expense")
 * @param {string} idColumn - Primary key column name (e.g. "expense_id")
 * @param {number|string} idValue - ID value to match (e.g. 17)
 * @param {string[]} fields - List of file fields to fetch (e.g. ["expense_documents", "treatment_images"])
 * @param {number} tenantId - (Optional) tenant_id for multitenancy
 * @returns {Promise<Object>} - { field1: [...], field2: [...] }
 */
const getFileFieldsFromDB = async (tableName, idColumn, idValue, fields, tenantId = null) => {
  if (!fields || fields.length === 0) return {};

  const columns = fields.map(f => `\`${f}\``).join(", ");
  const query = `
    SELECT ${columns}
    FROM \`${tableName}\`
    WHERE \`${idColumn}\` = ?
    ${tenantId !== null ? "AND tenant_id = ?" : ""}
    LIMIT 1
  `;

  const params = [idValue];
  if (tenantId !== null) params.push(tenantId);

  const [row] = await db.query(query, params);
  const result = {};

  for (const field of fields) {
    try {
      result[field] = JSON.parse(row?.[field] || "[]");
    } catch (err) {
      result[field] = [];
    }
  }

  return result;
};

module.exports = { getFileFieldsFromDB };
