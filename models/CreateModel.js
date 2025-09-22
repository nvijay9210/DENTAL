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
      (17, 'reminder_status', 'ADMIN'),
      (18, 'expense_category', 'ADMIN'),
      (19, 'pre_history', 'ADMIN'),
      (20, 'tax_catalog', 'ADMIN'),
      (21, 'category', 'ADMIN'),
      (22, 'medication', 'ADMIN'),
      (23, 'frequency', 'ADMIN'),
      (24, 'unit', 'ADMIN');
  `;

  try {
    await conn.query(sql);
    console.log(
      "✅ StatusType data added successfully with created_by = 'ADMIN'"
    );
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
      (?, 15, 'pending', 'pending', 'ADMIN'),
      (?, 15, 'confirmed', 'confirmed', 'ADMIN'),
      (?, 15, 'checkedin', 'checked_in', 'ADMIN'),
      (?, 15, 'inprogress', 'in_progress', 'ADMIN'),
      (?, 15, 'completed', 'completed', 'ADMIN'),
      (?, 15, 'cancelled', 'cancelled', 'ADMIN'),
      (?, 15, 'clinic_cancelled', 'clinic_cancelled', 'ADMIN'),
      (?, 15, 'noshow', 'no_show', 'ADMIN'),
      (?, 15, 'rescheduled', 'rescheduled', 'ADMIN'),
      (?, 15, 'followup', 'follow_up', 'ADMIN'),
      (?, 15, 'rejected', 'rejected', 'ADMIN'),
      (?, 15, 'expired', 'expired', 'ADMIN'),
      (?, 15, 'payment_pending', 'payment_pending', 'ADMIN'),
      (?, 15, 'paid', 'paid', 'ADMIN'),

      -- purchase_order_status (status_type_id = 16)
      (?, 16, 'pending', 'pending', 'ADMIN'),
      (?, 16, 'confirmed', 'confirmed', 'ADMIN'),
      (?, 16, 'shipped', 'shipped', 'ADMIN'),
      (?, 16, 'delivered', 'delivered', 'ADMIN'),
      (?, 16, 'cancelled', 'cancelled', 'ADMIN'),

      -- reminder_status (status_type_id = 17)
      (?, 17, 'pending', 'pending', 'ADMIN'),
      (?, 17, 'completed', 'completed', 'ADMIN'),
      (?, 17, 'dismissed', 'dismissed', 'ADMIN'),
      (?, 17, 'overdue', 'overdue', 'ADMIN'),
      (?, 17, 'in_progress', 'in_progress', 'ADMIN'),

      -- currency_code (status_type_id=14)
      (?, 14, 'Afghanistan', 'AFN ؋', 'ADMIN'),
      (?, 14, 'Albania', 'ALL L', 'ADMIN'),
      (?, 14, 'Algeria', 'DZD جد', 'ADMIN'),
      (?, 14, 'Andorra', 'EUR €', 'ADMIN'),
      (?, 14, 'Angola', 'AOA Kz', 'ADMIN'),
      (?, 14, 'Argentina', 'ARS $', 'ADMIN'),
      (?, 14, 'Armenia', 'AMD ', 'ADMIN'),
      (?, 14, 'Australia', 'AUD A$', 'ADMIN'),
      (?, 14, 'Austria', 'EUR €', 'ADMIN'),
      (?, 14, 'Azerbaijan', 'AZN ₼', 'ADMIN'),
      (?, 14, 'Bahamas', 'BSD B$', 'ADMIN'),
      (?, 14, 'Bahrain', 'BHD .ب.د', 'ADMIN'),
      (?, 14, 'Bangladesh', 'BDT ৳', 'ADMIN'),
      (?, 14, 'Barbados', 'BBD Bds$', 'ADMIN'),
      (?, 14, 'Belarus', 'BYN Br', 'ADMIN'),
      (?, 14, 'Belgium', 'EUR €', 'ADMIN'),
      (?, 14, 'Belize', 'BZD BZ$', 'ADMIN'),
      (?, 14, 'Benin', 'XOF CFA', 'ADMIN'),
      (?, 14, 'Bhutan', 'BTN Nu.', 'ADMIN'),
      (?, 14, 'Bolivia', 'BOB Bs.', 'ADMIN'),
      (?, 14, 'Bosnia & Herzegovina', 'BAM KM', 'ADMIN'),
      (?, 14, 'Botswana', 'BWP P', 'ADMIN'),
      (?, 14, 'Brazil', 'BRL R$', 'ADMIN'),
      (?, 14, 'Brunei', 'BND B$', 'ADMIN'),
      (?, 14, 'Bulgaria', 'BGN лв', 'ADMIN'),
      (?, 14, 'Burkina Faso', 'XOF CFA', 'ADMIN'),
      (?, 14, 'Burundi', 'BIF FBu', 'ADMIN'),
      (?, 14, 'Cambodia', 'KHR ៛', 'ADMIN'),
      (?, 14, 'Cameroon', 'XAF FCFA', 'ADMIN'),
      (?, 14, 'Canada', 'CAD C$', 'ADMIN'),
      (?, 14, 'Cape Verde', 'CVE $', 'ADMIN'),
      (?, 14, 'Central African Republic', 'XAF FCFA', 'ADMIN'),
      (?, 14, 'Chad', 'XAF FCFA', 'ADMIN'),
      (?, 14, 'Chile', 'CLP $', 'ADMIN'),
      (?, 14, 'China', 'CNY ¥', 'ADMIN'),
      (?, 14, 'Colombia', 'COP $', 'ADMIN'),
      (?, 14, 'Comoros', 'KMF CF', 'ADMIN'),
      (?, 14, 'Congo (DRC)', 'CDF FC', 'ADMIN'),
      (?, 14, 'Costa Rica', 'CRC ₡', 'ADMIN'),
      (?, 14, 'Croatia', 'EUR €', 'ADMIN'),
      (?, 14, 'Cuba', 'CUP $', 'ADMIN'),
      (?, 14, 'Cyprus', 'EUR €', 'ADMIN'),
      (?, 14, 'Czech Republic', 'CZK Kč', 'ADMIN'),
      (?, 14, 'Denmark', 'DKK kr', 'ADMIN'),
      (?, 14, 'Djibouti', 'DJF Fdj', 'ADMIN'),
      (?, 14, 'Dominican Republic', 'DOP RD$', 'ADMIN'),
      (?, 14, 'Ecuador', 'USD $', 'ADMIN'),
      (?, 14, 'Egypt', 'EGP £', 'ADMIN'),
      (?, 14, 'El Salvador', 'USD $', 'ADMIN'),
      (?, 14, 'Ethiopia', 'ETB Br', 'ADMIN'),
      (?, 14, 'Eurozone', 'EUR €', 'ADMIN'),
      (?, 14, 'Fiji', 'FJD FJ$', 'ADMIN'),
      (?, 14, 'Finland', 'EUR €', 'ADMIN'),
      (?, 14, 'France', 'EUR €', 'ADMIN'),
      (?, 14, 'Gabon', 'XAF FCFA', 'ADMIN'),
      (?, 14, 'Gambia', 'GMD D', 'ADMIN'),
      (?, 14, 'Georgia', 'GEL ₾', 'ADMIN'),
      (?, 14, 'Germany', 'EUR €', 'ADMIN'),
      (?, 14, 'Ghana', 'GHS ₵', 'ADMIN'),
      (?, 14, 'Greece', 'EUR €', 'ADMIN'),
      (?, 14, 'Guatemala', 'GTQ Q', 'ADMIN'),
      (?, 14, 'Guinea', 'GNF FG', 'ADMIN'),
      (?, 14, 'Honduras', 'HNL L', 'ADMIN'),
      (?, 14, 'Hong Kong', 'HKD HK$', 'ADMIN'),
      (?, 14, 'Hungary', 'HUF Ft', 'ADMIN'),
      (?, 14, 'Iceland', 'ISK kr', 'ADMIN'),
      (?, 14, 'India', 'INR ₹', 'ADMIN'),
      (?, 14, 'Indonesia', 'IDR Rp', 'ADMIN'),
      (?, 14, 'Iran', 'IRR ﷼', 'ADMIN'),
      (?, 14, 'Iraq', 'IQD د.ع', 'ADMIN'),
      (?, 14, 'Ireland', 'EUR €', 'ADMIN'),
      (?, 14, 'Israel', 'ILS ₪', 'ADMIN'),
      (?, 14, 'Italy', 'EUR €', 'ADMIN'),
      (?, 14, 'Jamaica', 'JMD J$', 'ADMIN'),
      (?, 14, 'Japan', 'JPY ¥', 'ADMIN'),
      (?, 14, 'Jordan', 'JOD ا.د', 'ADMIN'),
      (?, 14, 'Kazakhstan', 'KZT ₸', 'ADMIN'),
      (?, 14, 'Kenya', 'KES KSh', 'ADMIN'),
      (?, 14, 'Kuwait', 'KWD KD', 'ADMIN'),
      (?, 14, 'Kyrgyzstan', 'KGS лв', 'ADMIN'),
      (?, 14, 'Laos', 'LAK ₭', 'ADMIN'),
      (?, 14, 'Latvia', 'EUR €', 'ADMIN'),
      (?, 14, 'Lebanon', 'LBP ل.ل', 'ADMIN'),
      (?, 14, 'Lesotho', 'LSL L', 'ADMIN'),
      (?, 14, 'Liberia', 'LRD L$', 'ADMIN'),
      (?, 14, 'Libya', 'LYD د.ل', 'ADMIN'),
      (?, 14, 'Liechtenstein', 'CHF CHF', 'ADMIN'),
      (?, 14, 'Lithuania', 'EUR €', 'ADMIN'),
      (?, 14, 'Luxembourg', 'EUR €', 'ADMIN'),
      (?, 14, 'Madagascar', 'MGA Ar', 'ADMIN'),
      (?, 14, 'Malawi', 'MWK MK', 'ADMIN'),
      (?, 14, 'Malaysia', 'MYR RM', 'ADMIN'),
      (?, 14, 'Maldives', 'MVR Rf', 'ADMIN'),
      (?, 14, 'Mali', 'XOF CFA', 'ADMIN'),
      (?, 14, 'Malta', 'EUR €', 'ADMIN'),
      (?, 14, 'Mauritania', 'MRU UM', 'ADMIN'),
      (?, 14, 'Mauritius', 'MUR ₨', 'ADMIN'),
      (?, 14, 'Mexico', 'MXN $', 'ADMIN'),
      (?, 14, 'Moldova', 'MDL L', 'ADMIN'),
      (?, 14, 'Monaco', 'EUR €', 'ADMIN'),
      (?, 14, 'Mongolia', 'MNT ₮', 'ADMIN'),
      (?, 14, 'Montenegro', 'EUR €', 'ADMIN'),
      (?, 14, 'Morocco', 'MAD MAD', 'ADMIN'),
      (?, 14, 'Mozambique', 'MZN MT', 'ADMIN'),
      (?, 14, 'Myanmar', 'MMK Ks', 'ADMIN'),
      (?, 14, 'Namibia', 'NAD N$', 'ADMIN'),
      (?, 14, 'Nepal', 'NPR ₨', 'ADMIN'),
      (?, 14, 'Netherlands', 'EUR €', 'ADMIN'),
      (?, 14, 'New Zealand', 'NZD NZ$', 'ADMIN'),
      (?, 14, 'Nicaragua', 'NIO C$', 'ADMIN'),
      (?, 14, 'Niger', 'XOF CFA', 'ADMIN'),
      (?, 14, 'Nigeria', 'NGN ₦', 'ADMIN'),
      (?, 14, 'North Korea', 'KPW ₩', 'ADMIN'),
      (?, 14, 'North Macedonia', 'MKD ден', 'ADMIN'),
      (?, 14, 'Norway', 'NOK kr', 'ADMIN'),
      (?, 14, 'Oman', 'OMR ع.ر.', 'ADMIN'),
      (?, 14, 'Pakistan', 'PKR ₨', 'ADMIN'),
      (?, 14, 'Palestine', 'ILS ₪', 'ADMIN'),
      (?, 14, 'Panama', 'PAB B/.', 'ADMIN'),
      (?, 14, 'Papua New Guinea', 'PGK K', 'ADMIN'),
      (?, 14, 'Paraguay', 'PYG ₲', 'ADMIN'),
      (?, 14, 'Peru', 'PEN S/', 'ADMIN'),
      (?, 14, 'Philippines', 'PHP ₱', 'ADMIN'),
      (?, 14, 'Poland', 'PLN zł', 'ADMIN'),
      (?, 14, 'Portugal', 'EUR €', 'ADMIN'),
      (?, 14, 'Qatar', 'QAR ق.ر', 'ADMIN'),
      (?, 14, 'Romania', 'RON lei', 'ADMIN'),
      (?, 14, 'Russia', 'RUB ₽', 'ADMIN'),
      (?, 14, 'Rwanda', 'RWF FRw', 'ADMIN'),
      (?, 14, 'Saudi Arabia', 'SAR SAR', 'ADMIN'),
      (?, 14, 'Senegal', 'XOF CFA', 'ADMIN'),
      (?, 14, 'Serbia', 'RSD дин.', 'ADMIN'),
      (?, 14, 'Seychelles', 'SCR ₨', 'ADMIN'),
      (?, 14, 'Singapore', 'SGD S$', 'ADMIN'),
      (?, 14, 'Slovakia', 'EUR €', 'ADMIN'),
      (?, 14, 'Slovenia', 'EUR €', 'ADMIN'),
      (?, 14, 'Solomon Islands', 'SBD SI$', 'ADMIN'),
      (?, 14, 'South Africa', 'ZAR R', 'ADMIN'),
      (?, 14, 'South Korea', 'KRW ₩', 'ADMIN'),
      (?, 14, 'Spain', 'EUR €', 'ADMIN'),
      (?, 14, 'Sri Lanka', 'LKR Rs', 'ADMIN'),
      (?, 14, 'Sudan', 'SDG س.ج.', 'ADMIN'),
      (?, 14, 'Sweden', 'SEK kr', 'ADMIN'),
      (?, 14, 'Switzerland', 'CHF CHF', 'ADMIN'),
      (?, 14, 'Syria', 'SYP £S', 'ADMIN'),
      (?, 14, 'Taiwan', 'TWD NT$', 'ADMIN'),
      (?, 14, 'Tanzania', 'TZS TSh', 'ADMIN'),
      (?, 14, 'Thailand', 'THB ฿', 'ADMIN'),
      (?, 14, 'Togo', 'XOF CFA', 'ADMIN'),
      (?, 14, 'Tonga', 'TOP T$', 'ADMIN'),
      (?, 14, 'Trinidad & Tobago', 'TTD TT$', 'ADMIN'),
      (?, 14, 'Tunisia', 'TND ت.د', 'ADMIN'),
      (?, 14, 'Turkey', 'TRY ₺', 'ADMIN'),
      (?, 14, 'Turkmenistan', 'TMT T', 'ADMIN'),
      (?, 14, 'Uganda', 'UGX USh', 'ADMIN'),
      (?, 14, 'Ukraine', 'UAH ₴', 'ADMIN'),
      (?, 14, 'United Arab Emirates', 'AED AED', 'ADMIN'),
      (?, 14, 'United Kingdom', 'GBP £', 'ADMIN'),
      (?, 14, 'United States', 'USD $', 'ADMIN'),
      (?, 14, 'Uruguay', 'UYU $U', 'ADMIN'),
      (?, 14, 'Uzbekistan', 'UZS лв', 'ADMIN'),
      (?, 14, 'Vanuatu', 'VUV VT', 'ADMIN'),
      (?, 14, 'Vatican City', 'EUR €', 'ADMIN'),
      (?, 14, 'Venezuela', 'VES Bs', 'ADMIN'),
      (?, 14, 'Vietnam', 'VND ₫', 'ADMIN'),
      (?, 14, 'Yemen', 'YER ﷼', 'ADMIN'),
      (?, 14, 'Zambia', 'ZMW ZK', 'ADMIN'),
      (?, 14, 'Zimbabwe', 'ZWL Z$', 'ADMIN')`

const tenants=process.env.REALM_TENANT_MAP
  try {
    for (const entry of tenants.split(",")) {
      const [realm, tenantId] = entry.trim().split(":");
      const values = Array(192).fill(tenantId);
      await conn.query(sql,values);
    }
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
const createReferenceTable = async () => {
  const query = createTableQuery.addReferenceTable;
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Reference table created successfully.");
  } catch (error) {
    console.error("Error creating Reference table:", error);
    throw new Error(
      "Database error occurred while creating the Reference table."
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
  addStatusTypeSubTableData,
  addStatusTypeTableData,
  createReferenceTable
};
