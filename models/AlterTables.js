const pool = require("../config/db");

async function updateDentistTableStructure() {
    const query = `
      ALTER TABLE dentist
      ADD COLUMN IF NOT EXISTS currency_code CHAR(10) DEFAULT 'INR',
      MODIFY COLUMN phone_number VARCHAR(20),
      MODIFY COLUMN alternate_phone_number VARCHAR(20);
    `;
    const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Dentist table altered successfully.");
  } catch (error) {
    console.error("Error alter Dentist table:", error);
    throw new Error("Database error occurred while alter the Dentist table.");
  } finally {
    conn.release();
  }
  }
async function updatePatientTableStructure() {
    const query = `
      ALTER TABLE patient
      MODIFY COLUMN phone_number VARCHAR(20),
      MODIFY COLUMN alternate_phone_number VARCHAR(20);
    `;
    const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Patient table altered successfully.");
  } catch (error) {
    console.error("Error alter Patient table:", error);
    throw new Error("Database error occurred while alter the Patient table.");
  } finally {
    conn.release();
  }
  }

async function updateReceptionTableStructure() {
    const query = `
      ALTER TABLE reception
      MODIFY COLUMN phone_number VARCHAR(20),
      MODIFY COLUMN alternate_phone_number VARCHAR(20);
    `;
    const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Reception table altered successfully.");
  } catch (error) {
    console.error("Error alter Dentist table:", error);
    throw new Error("Database error occurred while alter the Reception table.");
  } finally {
    conn.release();
  }
  }
  

(async () => {
  try {
    await updateDentistTableStructure();
    await updatePatientTableStructure();
    await updateReceptionTableStructure();
  } catch (err) {
    console.error("Table update failed:", err.message);
  }
})();


