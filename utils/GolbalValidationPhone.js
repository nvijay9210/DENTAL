const { CustomError } = require("../middlewares/CustomeError");
const pool = require("../config/db");

// ✅ Table-to-ID mapping
const tableIdMap = {
  clinic: "clinic_id",
  dentist: "dentist_id",
  patient: "patient_id",
};

// ✅ Tables to check
const tablesToCheck = Object.keys(tableIdMap); // ["clinic", "dentist", "patient"]

/**
 * Checks if a phone number exists anywhere in the system (all tables)
 */
const checkGlobalPhoneNumberExists = async (phoneNumber, tenantId) => {
  const conn = await pool.getConnection();
  try {
    for (const table of tablesToCheck) {
      const idColumn = tableIdMap[table];

      // Check phone_number
      const [rows] = await conn.query(
        `SELECT 1 FROM ?? WHERE phone_number = ? AND tenant_id = ? LIMIT 1`,
        [table, phoneNumber, tenantId]
      );
      if (rows.length > 0) {
        throw new CustomError(`Phone number already exists in ${table}`, 409);
      }

      // Check alternate_phone_number
      const [altRows] = await conn.query(
        `SELECT 1 FROM ?? WHERE alternate_phone_number = ? AND tenant_id = ? LIMIT 1`,
        [table, phoneNumber, tenantId]
      );
      if (altRows.length > 0) {
        throw new CustomError(`Phone number already used as alternate in ${table}`, 409);
      }

      // ✅ Additional check only for patient table
      if (table === 'patient') {
        const [emergencyRows] = await conn.query(
          `SELECT 1 FROM patient WHERE emergency_contact_number = ? AND tenant_id = ? LIMIT 1`,
          [phoneNumber, tenantId]
        );
        if (emergencyRows.length > 0) {
          throw new CustomError(`Phone number already used as emergency contact in patient`, 409);
        }
      }
    }
  } catch (err) {
    console.error("Global phone check error:", err.message);
    throw err;
  } finally {
    conn.release();
  }
};


/**
 * Checks if a phone number exists anywhere in the system, excluding current record
 * ❌ NOT NEEDED ANYMORE – see below
 */
const checkGlobalPhoneNumberExistsWithId = async (
  entityType,
  phoneNumber,
  entityId,
  tenantId
) => {
  const conn = await pool.getConnection();
  try {
    for (const table of tablesToCheck) {
      const idColumn = tableIdMap[table];

      // Check phone_number
      const [rows] = await conn.query(
        `SELECT 1 FROM ?? WHERE phone_number = ? AND tenant_id = ? AND ?? != ? LIMIT 1`,
        [table, phoneNumber, tenantId, idColumn, entityId]
      );
      if (rows.length > 0) {
        throw new CustomError(`Phone number already exists in ${table}`, 409);
      }

      // Check alternate_phone_number
      const [altRows] = await conn.query(
        `SELECT 1 FROM ?? WHERE alternate_phone_number = ? AND tenant_id = ? AND ?? != ? LIMIT 1`,
        [table, phoneNumber, tenantId, idColumn, entityId]
      );
      if (altRows.length > 0) {
        throw new CustomError(`Phone number already used as alternate in ${table}`, 409);
      }

      // ✅ Additional check for emergency_contact_number (patient only)
      if (table === 'patient') {
        const [emergencyRows] = await conn.query(
          `SELECT 1 FROM patient WHERE emergency_contact_number = ? AND tenant_id = ? AND patient_id != ? LIMIT 1`,
          [phoneNumber, tenantId, entityId]
        );
        if (emergencyRows.length > 0) {
          throw new CustomError(`Phone number already used as emergency contact in patient`, 409);
        }
      }
    }
  } catch (err) {
    console.error("Global phone check with ID error:", err.message);
    throw err;
  } finally {
    conn.release();
  }
};


module.exports = {
  tablesToCheck,
  checkGlobalPhoneNumberExists,
  checkGlobalPhoneNumberExistsWithId,
};