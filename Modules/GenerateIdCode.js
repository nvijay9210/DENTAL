// ==========================
// HELPER: Pad numbers to desired width
// ==========================
function padNumber(num, width = 4) {
    return String(num).padStart(width, "0");
  }
  
  // ==========================
  // GENERIC FUNCTION: Generate next unique code
  // ==========================
  /**
   * Generates a unique code for any table/column with a prefix.
   * 
   * @param {object} pool - MySQL/MariaDB connection pool
   * @param {string} prefix - Fixed prefix e.g., "APODEN"
   * @param {string} table - Table name e.g., "dentist"
   * @param {string} column - Column name e.g., "dentist_code"
   * @param {number} numberWidth - Number of digits in numeric part (default: 4)
   * @returns {Promise<string>} New unique code
   */
  async function generateUniqueCode(pool, prefix, table, column, numberWidth = 4) {
    // 1️⃣ Get the last code from DB
    const query = `SELECT ${column} FROM ${table} WHERE ${column} LIKE ? ORDER BY ${column} DESC LIMIT 1`;
    const [rows] = await pool.query(query, [`${prefix}%`]);
  
    let nextNumber = 1;
  
    if (rows.length > 0) {
      const lastCode = rows[0][column];
      const numberPart = lastCode.replace(prefix, "").match(/\d+/);
      nextNumber = numberPart ? parseInt(numberPart[0]) + 1 : 1;
    }
  
    // Safety check: max number based on width
    const maxNumber = parseInt("9".repeat(numberWidth));
    if (nextNumber > maxNumber) throw new Error(`Maximum code limit reached (${maxNumber})`);
  
    const newCode = `${prefix}${padNumber(nextNumber, numberWidth)}`;
  
    // 2️⃣ Check again if this code exists (avoid rare race condition)
    const [exists] = await pool.query(`SELECT 1 FROM ${table} WHERE ${column} = ? LIMIT 1`, [newCode]);
    if (exists.length > 0) {
      // Recursive retry if already exists
      return generateUniqueCode(pool, prefix, table, column, numberWidth);
    }
  
    return newCode;
  }
  
  // ==========================
  // Export the function
  // ==========================
  module.exports = { generateUniqueCode };
  