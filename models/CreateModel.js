const pool = require("../config/db");

const { createTableQuery } = require("../query/CreateTableQuery");

const createTenantTable = async () => {
  // const query = tenantQuery.createTenantTable;
  const query = createTableQuery.addTenant;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    await seedTenantsFromEnv();
    console.log("Tenant table created successfully.");
  } catch (error) {
    console.error("Error creating Tenant table:", error);
    throw new Error("Database error occurred while creating the Tenant table.");
  } finally {
    conn.release();
  }
};

const createClinicTable = async () => {
  const query = createTableQuery.addClinic;
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
  const query = createTableQuery.addDentist;
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
  const query = createTableQuery.addPatient;
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
  const query = createTableQuery.addAppointment;
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
  const query = createTableQuery.addTreatment;
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
  const query = createTableQuery.addPrescription;
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
  const query = createTableQuery.addStatusType;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    await addStatusTypeTableData();
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
  const query = createTableQuery.addStatusTypeSub;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    await addStatusTypeSubTableData();
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
  const query = createTableQuery.addAsset;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Asset table created successfully.");
  } catch (error) {
    console.error("Error creating Asset table:", error);
    throw new Error("Database error occurred while creating the Asset table.");
  } finally {
    conn.release();
  }
};

const createExpenseTable = async () => {
  const query = createTableQuery.addExpense;
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
  const query = createTableQuery.addSupplier;
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
const createSupplierProdutsTable = async () => {
  const query = createTableQuery.addSupplierProducts;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("SupplierProducts table created successfully.");
  } catch (error) {
    console.error("Error creating SupplierProducts table:", error);
    throw new Error(
      "Database error occurred while creating the SupplierProducts table."
    );
  } finally {
    conn.release();
  }
};
const createPurchaseOrder = async () => {
  const query = createTableQuery.addPurchaseOrder;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("PurchaseOrder table created successfully.");
  } catch (error) {
    console.error("Error creating PurchaseOrder table:", error);
    throw new Error(
      "Database error occurred while creating the PurchaseOrder table."
    );
  } finally {
    conn.release();
  }
};
const createSupplierPaymentsTable = async () => {
  const query = createTableQuery.addSupplierPayments;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("SupplierPayments table created successfully.");
  } catch (error) {
    console.error("Error creating SupplierPayments table:", error);
    throw new Error(
      "Database error occurred while creating the SupplierPayments table."
    );
  } finally {
    conn.release();
  }
};
const createSupplierReviewTable = async () => {
  const query = createTableQuery.addSupplierReview;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("SupplierReview table created successfully.");
  } catch (error) {
    console.error("Error creating SupplierReview table:", error);
    throw new Error(
      "Database error occurred while creating the SupplierReview table."
    );
  } finally {
    conn.release();
  }
};

const createReminderTable = async () => {
  const query = createTableQuery.addReminder;
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
  const query = createTableQuery.addAppointmentReschedules;
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
const createReception = async () => {
  const query = createTableQuery.addReception;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Reception table created successfully.");
  } catch (error) {
    console.error("Error creating Reception table:", error);
    throw new Error(
      "Database error occurred while creating the Reception table."
    );
  } finally {
    conn.release();
  }
};

const createPaymentTable = async () => {
  const query = createTableQuery.addPayment;
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
const createUserActivityTable = async () => {
  const query = createTableQuery.addUserActivity;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("UserActivity table created successfully.");
  } catch (error) {
    console.error("Error creating UserActivity table:", error);
    throw new Error(
      "Database error occurred while creating the UserActivity table."
    );
  } finally {
    conn.release();
  }
};
const creatLoginHistoryTable = async () => {
  const query = createTableQuery.addLoginHistory;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("LoginHistory table created successfully.");
  } catch (error) {
    console.error("Error creating LoginHistory table:", error);
    throw new Error(
      "Database error occurred while creating the LoginHistory table."
    );
  } finally {
    conn.release();
  }
};
const creatNotificationTable = async () => {
  const query = createTableQuery.addNotificationSend;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Notification table created successfully.");
  } catch (error) {
    console.error("Error creating Notification table:", error);
    throw new Error(
      "Database error occurred while creating the Notification table."
    );
  } finally {
    conn.release();
  }
};

const creatNotificationRecipientsTable = async () => {
  const query = createTableQuery.addNotificationRecipients;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("NotificationRecipients table created successfully.");
  } catch (error) {
    console.error("Error creating NotificationRecipients table:", error);
    throw new Error(
      "Database error occurred while creating the NotificationRecipients table."
    );
  } finally {
    conn.release();
  }
};

const createAppointmentStatsTable = async () => {
  const query = createTableQuery.addAppointmentStats;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("AppointmentStats table created successfully.");
  } catch (error) {
    console.error("Error creating AppointmentStats table:", error);
    throw new Error(
      "Database error occurred while creating the AppointmentStats table."
    );
  } finally {
    conn.release();
  }
};

const createToothDetailsTable = async () => {
  const query = createTableQuery.addToothDetails;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("ToothDetails table created successfully.");
  } catch (error) {
    console.error("Error creating ToothDetails table:", error);
    throw new Error(
      "Database error occurred while creating the ToothDetails table."
    );
  } finally {
    conn.release();
  }
};

const createPatientClinicJoinTable = async () => {
  const query = createTableQuery.addPatientClinic;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("PatientClinicJoin table created successfully.");
  } catch (error) {
    console.error("Error creating PatientClinicJoin table:", error);
    throw new Error(
      "Database error occurred while creating the PatientClinicJoin table."
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
    INSERT IGNORE INTO \`statustype\` 
    (\`status_type_id\`, \`status_type\`, \`created_by\`) 
    VALUES 
      (1, 'specialisation', 'ADMIN'),
      (2, 'designation', 'ADMIN'),
      (3, 'available_services', 'ADMIN'),
      (4, 'alcohol_consumption', 'ADMIN'),
      (5, 'mode_of_payment', 'ADMIN'),
      (6, 'asset_type', 'ADMIN'),
      (7, 'asset_status', 'ADMIN'),
      (8, 'languages_spoken', 'ADMIN'),
      (9, 'tenant_app_font', 'ADMIN'),
      (10, 'treatment_type', 'ADMIN'),
      (11, 'treatment_status', 'ADMIN'),
      (12, 'smoking_status', 'ADMIN'),
      (13, 'disease_type', 'ADMIN'),
      (14, 'currency_code', 'ADMIN'),
      (15, 'appointment_status', 'ADMIN'),
      (16, 'purchase_order_status', 'ADMIN'),
      (17, 'reminder_status', 'ADMIN');
  `;

  try {
    await conn.query(sql);
    console.log("✅ StatusType data added successfully with created_by = 'ADMIN'");
  } catch (err) {
    console.error("❌ Error inserting StatusType data:", err.message);
  } finally {
    conn.release();
  }
}

async function addStatusTypeSubTableData() {
  const conn = await pool.getConnection();

  const sql = `
    INSERT IGNORE INTO \`statustypesub\` 
    (\`tenant_id\`, \`status_type_id\`, \`status_type_sub\`, \`status_type_sub_ref\`, \`created_by\`) 
    VALUES 
      -- appointment_status (status_type_id = 15)
      (1, 15, 'pending', 'pending', 'ADMIN'),
      (1, 15, 'confirmed', 'confirmed', 'ADMIN'),
      (1, 15, 'checkedin', 'checked_in', 'ADMIN'),
      (1, 15, 'inprogress', 'in_progress', 'ADMIN'),
      (1, 15, 'completed', 'completed', 'ADMIN'),
      (1, 15, 'cancelled', 'cancelled', 'ADMIN'),
      (1, 15, 'clinic_cancelled', 'clinic_cancelled', 'ADMIN'),
      (1, 15, 'noshow', 'no_show', 'ADMIN'),
      (1, 15, 'rescheduled', 'rescheduled', 'ADMIN'),
      (1, 15, 'followup', 'follow_up', 'ADMIN'),
      (1, 15, 'rejected', 'rejected', 'ADMIN'),
      (1, 15, 'expired', 'expired', 'ADMIN'),
      (1, 15, 'payment_pending', 'payment_pending', 'ADMIN'),
      (1, 15, 'paid', 'paid', 'ADMIN'),

      -- purchase_order_status (status_type_id = 16)
      (1, 16, 'pending', 'pending', 'ADMIN'),
      (1, 16, 'confirmed', 'confirmed', 'ADMIN'),
      (1, 16, 'shipped', 'shipped', 'ADMIN'),
      (1, 16, 'delivered', 'delivered', 'ADMIN'),
      (1, 16, 'cancelled', 'cancelled', 'ADMIN'),

      -- reminder_status (status_type_id = 17)
      (1, 17, 'pending', 'pending', 'ADMIN'),
      (1, 17, 'completed', 'completed', 'ADMIN'),
      (1, 17, 'dismissed', 'dismissed', 'ADMIN'),
      (1, 17, 'overdue', 'overdue', 'ADMIN'),
      (1, 17, 'in_progress', 'in_progress', 'ADMIN');
  `;

  try {
    await conn.query(sql);
    console.log("✅ statustypesub: All status sub-data added successfully");
  } catch (err) {
    console.error("❌ Error inserting statustypesub data:", err.message);
    // Log full SQL for debugging if needed
    // console.log("SQL:", sql);
  } finally {
    conn.release();
  }
}

const createDocumentJoinTable = async () => {
  const query = createTableQuery.addDocumentTable;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Document table created successfully.");
  } catch (error) {
    console.error("Error creating Document table:", error);
    throw new Error(
      "Database error occurred while creating the Document table."
    );
  } finally {
    conn.release();
  }
};

require("dotenv").config();

async function seedTenantsFromEnv() {
  const REALM_TENANT_MAP = process.env.REALM_TENANT_MAP;
  const REALM_TENANT_DOMAIN_MAP = process.env.REALM_TENANT_DOMAIN_MAP;
  const DEFAULT_CREATED_BY = process.env.DEFAULT_CREATED_BY || "ADMIN";

  if (!REALM_TENANT_MAP || !REALM_TENANT_DOMAIN_MAP) {
    console.warn("Missing REALM_TENANT_MAP or REALM_TENANT_DOMAIN_MAP");
    return;
  }

  const realmTenantMap = {};
  const domainTenantMap = {};

  // Parse REALM_TENANT_MAP into object: {1: "smilecare", 2: "anotherrealm"}
  for (const entry of REALM_TENANT_MAP.split(",")) {
    const [realm, tenantId] = entry.trim().split(":");
    realmTenantMap[tenantId] = realm;
  }

  // Parse REALM_TENANT_DOMAIN_MAP into object: {1: ".in", 2: ".com"}
  for (const entry of REALM_TENANT_DOMAIN_MAP.split(",")) {
    const [domain, tenantId] = entry.trim().split(":");
    domainTenantMap[tenantId] = domain;
  }

  // Combine and prepare inserts
  const tenantIds = [
    ...new Set([
      ...Object.keys(realmTenantMap),
      ...Object.keys(domainTenantMap),
    ]),
  ];

  for (const tenantId of tenantIds) {
    const tenantName = realmTenantMap[tenantId] || null;
    const tenantDomain = domainTenantMap[tenantId] || null;

    if (!tenantName || !tenantDomain) {
      console.warn(`Skipping tenant_id=${tenantId}: missing name or domain`);
      continue;
    }

    const sql = `
      INSERT IGNORE INTO tenant (
        tenant_id,
        tenant_name,
        tenant_domain,
        created_by
      ) VALUES (?, ?, ?, ?)
    `;

    try {
      const conn = await pool.getConnection();
      await conn.query(sql, [
        parseInt(tenantId, 10),
        tenantName,
        tenantDomain,
        DEFAULT_CREATED_BY,
      ]);
      console.log(
        `✅ Inserted/Updated tenant: ${tenantName} (${tenantDomain})`
      );
      conn.release();
    } catch (err) {
      console.error(`❌ Error inserting tenant_id=${tenantId}:`, err.message);
    }
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
  createSupplierProdutsTable,
  createSupplierPaymentsTable,
  createSupplierReviewTable,
  createPurchaseOrder,
  createReminderTable,
  createPaymentTable,
  createAppointmentReschedulesTable,
  createReception,
  createUserActivityTable,
  creatLoginHistoryTable,
  creatNotificationTable,
  creatNotificationRecipientsTable,
  createAppointmentStatsTable,
  createToothDetailsTable,
  createPatientClinicJoinTable,
  createDocumentJoinTable,
};
