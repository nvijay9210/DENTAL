const pool = require("../config/db");
const { userQuery } = require("../query/userQuery");
const { tenantQuery } = require("../query/TenantQuery");
const { clinicQuery } = require("../query/ClinicQuery");
const { dentistQuery } = require("../query/DentistQuery");
const { patientQuery } = require("../query/PatientQuery");
const { appointmentQuery } = require("../query/AppoinmentQuery");
const { treatmentQuery } = require("../query/TreatmentQuery");
const { prescriptionQuery } = require("../query/PrescriptionQuery");

const createTenantTable = async () => {
  const query = tenantQuery.createTenantTable;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Tenant table created successfully.");
  } catch (error) {
    console.error("Error creating Tenant table:", error);
    throw new Error("Database error occurred while creating the Tenant table.");
  } finally {
    conn.release();
  }
};

const createClinicTable = async () => {
  const query = clinicQuery.createClinicTable;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Hospial table created successfully.");
  } catch (error) {
    console.error("Error creating Hospial table:", error);
    throw new Error(
      "Database error occurred while creating the Hospial table."
    );
  } finally {
    conn.release();
  }
};

const createDentistTable = async () => {
  const query = dentistQuery.createDentistTable;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Dentist table created successfully.");
  } catch (error) {
    console.error("Error creating Dentist table:", error);
    throw new Error(
      "Database error occurred while creating the Dentist table."
    );
  } finally {
    conn.release();
  }
};
const createPatientTable = async () => {
  const query = patientQuery.createPatientTable;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Patient table created successfully.");
  } catch (error) {
    console.error("Error creating Patient table:", error);
    throw new Error(
      "Database error occurred while creating the Patient table."
    );
  } finally {
    conn.release();
  }
};

const createAppointmentTable = async () => {
  const query = appointmentQuery.createAppointmnetTable;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Appointment table created successfully.");
  } catch (error) {
    console.error("Error creating Appointment table:", error);
    throw new Error(
      "Database error occurred while creating the Appointment table."
    );
  } finally {
    conn.release();
  }
};

const createTreatmentTable = async () => {
  const query = treatmentQuery.createTable;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Treatment table created successfully.");
  } catch (error) {
    console.error("Error creating Treatment table:", error);
    throw new Error(
      "Database error occurred while creating the Treatment table."
    );
  } finally {
    conn.release();
  }
};

const createPrescriptionTable = async () => {
  const query = prescriptionQuery.createTable;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Prescription table created successfully.");
  } catch (error) {
    console.error("Error creating Prescription table:", error);
    throw new Error(
      "Database error occurred while creating the Prescription table."
    );
  } finally {
    conn.release();
  }
};

const createUserTable = async () => {
  const query = userQuery.createUserTable;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Users table created successfully.");
  } catch (error) {
    console.error("Error creating users table:", error);
    throw new Error("Database error occurred while creating the users table.");
  } finally {
    conn.release();
  }
};

module.exports = {
  createTenantTable,
  createClinicTable,
  createUserTable,
  createDentistTable,
  createPatientTable,
  createAppointmentTable,
  createTreatmentTable,
  createPrescriptionTable
};
