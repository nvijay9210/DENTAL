const { CustomError } = require("../middlewares/CustomeError");
const pool = require("../config/db");

// Helper function to validate email uniqueness across tables
const checkGlobalEmailUniqueness = async (conn, tenantId, email,currentTable, id = null) => {
  const tableIdMap = {
    clinic: "clinic_id",
    dentist: "dentist_id",
    patient: "patient_id"
  };

  for (const [table, idColumn] of Object.entries(tableIdMap)) {
    let query = `SELECT 1 FROM ?? WHERE email = ? AND tenant_id = ?`;
    const params = [table, email, tenantId];

    // Exclude current record during update
    if (id !== null && id !== undefined && id !== 0 && currentTable===table) {
      let query = `SELECT 1 FROM ?? WHERE email = ? AND tenant_id = ? AND ?? !=? LIMIT 1`;
      const params = [currentTable, email, tenantId,`${currentTable}_id`,id];
      try {
        const rows = await conn.query(query, params);
        console.log(rows[0])
        if (rows[0].length > 0) {
          throw new CustomError(`Email already exists in ${table}`, 409);
        }
      } catch (err) {
        console.error(`Error checking email in ${table}:`, err.message);
        throw new CustomError(`Email already exists in ${table}`, 409);
      }
    }

    query += ` LIMIT 1`;

    try {
      const rows = await conn.query(query, params);
      console.log(rows[0])
      if (rows[0].length > 0) {
        throw new CustomError(`Email already exists in ${table}`, 409);
      }
    } catch (err) {
      console.error(`Error checking email in ${table}:`, err.message);
      throw new CustomError(`Email already exists in ${table}`, 409);
    }
  }
};

// Main validator function
const globalValidationEmail = async (tenantId, email,currentTable, id = null) => {
  const conn = await pool.getConnection();

  console.log('tenant_id:',tenantId,'email:',email,'id:',id)

  try {
    // Only run email check if email is provided
    if (email) {
      // Optional: Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new CustomError("Invalid email format", 400);
      }

      // Validate ID if present
      if (id !== null && isNaN(parseInt(id))) {
        throw new CustomError("ID must be a valid integer", 400);
      }

      // Run the uniqueness check
      await checkGlobalEmailUniqueness(conn, tenantId, email,currentTable, id);
    } else {
      console.log("No email provided; skipping email uniqueness check.");
    }
  } finally {
    conn.release();
  }
};

module.exports = { globalValidationEmail, checkGlobalEmailUniqueness };