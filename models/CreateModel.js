const pool = require("../config/db");

const {createTableQuery}=require('../query/CreateTableQuery')

const createTenantTable = async () => {
  // const query = tenantQuery.createTenantTable;
  const query = createTableQuery.addTenant
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
  const query = createTableQuery.addClinic
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
  const query = createTableQuery.addDentist
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
  const query = createTableQuery.addPatient
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
  const query = createTableQuery.addAppointment
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
  const query = createTableQuery.addTreatment
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
  const query = createTableQuery.addPrescription
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

const createStatusTypeTable = async () => {
  const query =createTableQuery.addStatusType
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("statusType table created successfully.");
  } catch (error) {
    console.error("Error creating statusType table:", error);
    throw new Error(
      "Database error occurred while creating the statusType table."
    );
  } finally {
    conn.release();
  }
};

const createStatusTypeSubTable = async () => {
  const query = createTableQuery.addStatusTypeSub
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    await addStatusTypeTableData()
    console.log("StatusTypeSub table created successfully.");
  } catch (error) {
    console.error("Error creating StatusTypeSub table:", error);
    throw new Error(
      "Database error occurred while creating the StatusTypeSub table."
    );
  } finally {
    conn.release();
  }
};

const createAssetTable = async () => {
  const query =  createTableQuery.addAsset
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Asset table created successfully.");
  } catch (error) {
    console.error("Error creating Asset table:", error);
    throw new Error(
      "Database error occurred while creating the Asset table."
    );
  } finally {
    conn.release();
  }
};

const createExpenseTable = async () => {
  const query =  createTableQuery.addExpense
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Expense table created successfully.");
  } catch (error) {
    console.error("Error creating Expense table:", error);
    throw new Error(
      "Database error occurred while creating the Expense table."
    );
  } finally {
    conn.release();
  }
};

const createSupplierTable = async () => {
  const query =  createTableQuery.addSupplier
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Supplier table created successfully.");
  } catch (error) {
    console.error("Error creating Supplier table:", error);
    throw new Error(
      "Database error occurred while creating the Supplier table."
    );
  } finally {
    conn.release();
  }
};

const createReminderTable = async () => {
  const query =  createTableQuery.addReminder
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Reminder table created successfully.");
  } catch (error) {
    console.error("Error creating Reminder table:", error);
    throw new Error(
      "Database error occurred while creating the Reminder table."
    );
  } finally {
    conn.release();
  }
};
const createAppointmentReschedulesTable = async () => {
  const query =  createTableQuery.addAppointmentReschedules
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("AppointmentReschedules table created successfully.");
  } catch (error) {
    console.error("Error creating AppointmentReschedules table:", error);
    throw new Error(
      "Database error occurred while creating the AppointmentReschedules table."
    );
  } finally {
    conn.release();
  }
};
const createReceiption = async () => {
  const query =  createTableQuery.addReceiption
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Receiption table created successfully.");
  } catch (error) {
    console.error("Error creating Receiption table:", error);
    throw new Error(
      "Database error occurred while creating the Receiption table."
    );
  } finally {
    conn.release();
  }
};

const createPaymentTable = async () => {
  const query =  createTableQuery.addPayment
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Payment table created successfully.");
  } catch (error) {
    console.error("Error creating Payment table:", error);
    throw new Error(
      "Database error occurred while creating the Payment table."
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

async function addStatusTypeTableData() {
  const conn = await pool.getConnection();
  
  const sql = `
    INSERT IGNORE INTO statustype (status_type_id, Status_Type) 
    VALUES 
    (1, 'specialisation'),
(2, 'designation'),
(3, 'available_services'),
(4, 'alcohol_consumption'),
(5, 'mode_of_payment'),
(6, 'asset_type'),
(7, 'asset_status'),
(8, 'languages_spoken'),
(9, 'tenant_app_font'),
(10, 'treatment_type'),
(11, 'treatment_status'),
(12, 'smoking_status');
  `;

  try {
    await conn.query(sql);
    console.log("StatusType data added successfully");
  } catch (err) {
    console.error("Error inserting data:", err.message);
  } finally {
    if (conn) conn.release();
  }
}

module.exports = {
  createTenantTable,
  createClinicTable,
  createUserTable,
  createDentistTable,
  createPatientTable,
  createAppointmentTable,
  createTreatmentTable,
  createPrescriptionTable,
  createStatusTypeTable,
  createStatusTypeSubTable,
  createAssetTable,
  createExpenseTable,
  createSupplierTable,
  createReminderTable,
  createPaymentTable,
  createAppointmentReschedulesTable,
  createReceiption
};
