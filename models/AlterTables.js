const pool = require("../config/db");

// Utility: Check if a constraint exists
async function constraintExists(conn, tableName, constraintName) {
  const [rows] = await conn.query(`
    SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND CONSTRAINT_NAME = ?;
  `, [tableName, constraintName]);

  return rows.length > 0;
}

/**
 * Removes orphaned rows from a table where the foreign key has no matching reference.
 * @param {Object} conn - Database connection
 * @param {string} table - Table name with orphaned data
 * @param {string} column - Column referencing the foreign key
 * @param {string} refTable - Referenced table
 * @param {string} refColumn - Referenced column
 */
async function cleanupOrphanedRows(conn, table, column, refTable, refColumn) {
  const query = `
    DELETE FROM ?? 
    WHERE NOT EXISTS (
      SELECT 1 FROM ?? 
      WHERE ?? = ??.?? 
    );
  `;
  try {
    await conn.query(query, [table, refTable, refColumn, table, column]);
    console.log(`✅ Cleaned up orphaned rows in \`${table}\` for \`${column}\``);
  } catch (error) {
    console.error(`❌ Error cleaning up orphaned rows in \`${table}\`:`, error.message);
    throw error;
  }
}

// Step 1: Update clinic table structure
async function updateClinicTableStructure(conn) {
  const query = `
    ALTER TABLE clinic
      MODIFY COLUMN phone_number VARCHAR(20),
      MODIFY COLUMN alternate_phone_number VARCHAR(20);
  `;
  try {
    await conn.query(query);
    console.log("✅ Clinic table altered successfully.");
  } catch (error) {
    console.error("❌ Error altering Clinic table:", error.message);
    throw new Error("Database error occurred while altering the Clinic table.");
  }
}

// Step 2: Apply schema fixes (FKs + Indexes)
async function applySchemaFixes(conn) {
  try {
    console.log("🔄 Applying schema fixes...");

    // Asset → tenant
    if (!(await constraintExists(conn, 'asset', 'fk_asset_tenant'))) {
      await cleanupOrphanedRows(conn, 'asset', 'tenant_id', 'tenant', 'tenant_id');
      await conn.query(`
        ALTER TABLE asset 
        ADD CONSTRAINT fk_asset_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON UPDATE CASCADE;
      `);
    }

    // Asset → clinic
    if (!(await constraintExists(conn, 'asset', 'fk_asset_clinic'))) {
      await cleanupOrphanedRows(conn, 'asset', 'clinic_id', 'clinic', 'clinic_id');
      await conn.query(`
        ALTER TABLE asset 
        ADD CONSTRAINT fk_asset_clinic 
        FOREIGN KEY (clinic_id) REFERENCES clinic(clinic_id) ON UPDATE CASCADE;
      `);
    }

    // Expense → tenant
    if (!(await constraintExists(conn, 'expense', 'fk_expense_tenant'))) {
      await cleanupOrphanedRows(conn, 'expense', 'tenant_id', 'tenant', 'tenant_id');
      await conn.query(`
        ALTER TABLE expense 
        ADD CONSTRAINT fk_expense_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON UPDATE CASCADE;
      `);
    }

    // Loginhistory → tenant
    if (!(await constraintExists(conn, 'loginhistory', 'fk_loginhistory_tenant'))) {
      await cleanupOrphanedRows(conn, 'loginhistory', 'tenant_id', 'tenant', 'tenant_id');
      await conn.query(`
        ALTER TABLE loginhistory 
        ADD CONSTRAINT fk_loginhistory_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON UPDATE CASCADE;
      `);
    }

    // Loginhistory → clinic
    if (!(await constraintExists(conn, 'loginhistory', 'fk_loginhistory_clinic'))) {
      await cleanupOrphanedRows(conn, 'loginhistory', 'clinic_id', 'clinic', 'clinic_id');
      await conn.query(`
        ALTER TABLE loginhistory 
        ADD CONSTRAINT fk_loginhistory_clinic 
        FOREIGN KEY (clinic_id) REFERENCES clinic(clinic_id) ON UPDATE CASCADE;
      `);
    }

    // Add missing indexes
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_loginhistory_keycloak_user_id ON loginhistory(keycloak_user_id);`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_dentist_keycloak_id ON dentist(keycloak_id);`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_patient_keycloak_id ON patient(keycloak_id);`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_supplier_keycloak_id ON supplier(keycloak_id);`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_reception_keycloak_id ON reception(keycloak_id);`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_useractivity_keycloak_user_id ON useractivity(keycloak_user_id);`);

    // Optional indexes
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_appointment_status ON appointment(status);`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_appointment_date ON appointment(appointment_date);`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_payment_created_time ON payment(created_time);`);
    await conn.query(`CREATE INDEX IF NOT EXISTS idx_expense_created_time ON expense(created_time);`);

    console.log("✅ Schema fixes applied successfully.");
  } catch (error) {
    console.error("❌ Error applying schema fixes:", error.message);
    throw error;
  }
}

// Step 3: Fix appointment_reschedules table primary key
async function fixAppointmentReschedulePK(conn) {
  try {
    console.log("🔄 Fixing appointment_reschedules primary key...");

    // Step 1: Check if column name is incorrect
    const [columns] = await conn.query(`
      SHOW COLUMNS FROM appointment_reschedules LIKE 'resheduled_id';
    `);

    if (columns.length > 0) {
      // Rename column from 'resheduled_id' to 'rescheduled_id'
      await conn.query(`
        ALTER TABLE appointment_reschedules
        CHANGE COLUMN resheduled_id rescheduled_id INT(11) NOT NULL AUTO_INCREMENT;
      `);
      console.log("✅ Column renamed from 'resheduled_id' to 'rescheduled_id'");
    }

    // Step 2: Ensure rescheduled_id is PRIMARY KEY
    const [pkCheck] = await conn.query(`
      SHOW INDEX FROM appointment_reschedules WHERE Key_name = 'PRIMARY';
    `);

    if (pkCheck.length === 0) {
      // Add PRIMARY KEY on rescheduled_id if missing
      await conn.query(`
        ALTER TABLE appointment_reschedules
        ADD PRIMARY KEY (rescheduled_id);
      `);
      console.log("✅ Primary key added on 'rescheduled_id'");
    } else {
      console.log("✅ Primary key already exists on 'rescheduled_id'");
    }
  } catch (error) {
    console.error("❌ Error fixing appointment_reschedules PK:", error.message);
    throw error;
  }
}

// Step 4: Remove insurance_supported column from dentist table
async function removeInsuranceSupportedFromDentist(conn) {
  try {
    console.log("🔄 Removing 'insurance_supported' column from dentist table...");

    // Check if the column exists before attempting to drop it
    const [columns] = await conn.query(`
      SHOW COLUMNS FROM dentist LIKE 'insurance_supported';
    `);

    if (columns.length > 0) {
      await conn.query(`
        ALTER TABLE dentist
        DROP COLUMN insurance_supported;
      `);
      console.log("✅ Column 'insurance_supported' removed successfully.");
    } else {
      console.log("ℹ️ Column 'insurance_supported' does not exist. Skipping removal.");
    }
  } catch (error) {
    console.error("❌ Error removing 'insurance_supported' column:", error.message);
    throw error;
  }
}

// Step 5: Add 'insurance_policy_start_date' column to patient table
async function addInsurancePolicyDateColumnsToPatient(conn) {
  try {
    console.log("🔄 Adding insurance policy date columns to patient table...");

    // Check for insurance_policy_start_date
    const [startCol] = await conn.query(`
      SHOW COLUMNS FROM patient LIKE 'insurance_policy_start_date';
    `);

    // Check for insurance_policy_end_date
    const [endCol] = await conn.query(`
      SHOW COLUMNS FROM patient LIKE 'insurance_policy_end_date';
    `);

    if (endCol.length === 0) {
      await conn.query(`
        ALTER TABLE patient
        ADD COLUMN insurance_policy_end_date DATE NULL;
      `);
      console.log("✅ Column 'insurance_policy_end_date' added.");
    } else {
      console.log("ℹ️ Column 'insurance_policy_end_date' already exists.");
    }

    if (startCol.length === 0) {
      await conn.query(`
        ALTER TABLE patient
        ADD COLUMN insurance_policy_start_date DATE NULL AFTER insurance_policy_end_date;
      `);
      console.log("✅ Column 'insurance_policy_start_date' added.");
    } else {
      console.log("ℹ️ Column 'insurance_policy_start_date' already exists.");
    }
  } catch (error) {
    console.error("❌ Error adding insurance policy date columns:", error.message);
    throw error;
  }
}

// Step 6: Add new fields to expense table
async function addNewFieldsToExpenseTable(conn) {
  try {
    console.log("🔄 Adding new fields to expense table...");

    const columnsToAdd = [
      {
        name: 'paid_by',
        definition: 'VARCHAR(255) NULL DEFAULT NULL COMMENT \'Name or role of person who made the payment\''
      },
      {
        name: 'paid_by_user',
        definition: 'VARCHAR(255) NULL DEFAULT NULL COMMENT \'Keycloak user ID or username of the payer\''
      },
      {
        name: 'paid_to',
        definition: 'VARCHAR(255) NULL DEFAULT NULL COMMENT \'Name or entity that received the payment\''
      },
      {
        name: 'expense_documents',
        definition: 'JSON NULL DEFAULT NULL COMMENT \'List of document paths or URLs (stored as JSON)\''
      }
    ];

    for (const { name, definition } of columnsToAdd) {
      const [existing] = await conn.query(`SHOW COLUMNS FROM expense LIKE ?`, [name]);
      if (existing.length === 0) {
        await conn.query(`ALTER TABLE expense ADD COLUMN ${name} ${definition};`);
        console.log(`✅ Column \`${name}\` added successfully.`);
      } else {
        console.log(`ℹ️ Column \`${name}\` already exists.`);
      }
    }

  } catch (error) {
    console.error("❌ Error adding new fields to expense table:", error.message);
    throw error;
  }
}

// Main migration runner
(async () => {
  const conn = await pool.getConnection();
  try {
    console.log("🔌 Connected to database. Starting migration...");

    await conn.beginTransaction();

    // Step 1: Update clinic table
    await updateClinicTableStructure(conn);

    // Step 2: Apply schema fixes
    await applySchemaFixes(conn);

     // Step 3: Fix appointment_reschedules primary key
     await fixAppointmentReschedulePK(conn);

      // Step 4: Remove insurance_supported from dentist table
    await removeInsuranceSupportedFromDentist(conn);

    // Step 5: Add insurance_policy_start_date to patient table
    await addInsurancePolicyDateColumnsToPatient(conn);

    // Step 6: Add new fields to expense table
    await addNewFieldsToExpenseTable(conn);

    await conn.commit();
    console.log("🎉 Migration completed successfully.");
  } catch (err) {
    await conn.rollback();
    console.error("💥 Migration failed:", err.message);
  } finally {
    conn.release();
  }
})();