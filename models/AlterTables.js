const pool = require("../config/db");

// Utility: Check if a constraint exists
async function constraintExists(conn, tableName, constraintName) {
  const [rows] = await conn.query(
    `
    SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND CONSTRAINT_NAME = ?;
  `,
    [tableName, constraintName]
  );

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
    console.log(
      `✅ Cleaned up orphaned rows in \`${table}\` for \`${column}\``
    );
  } catch (error) {
    console.error(
      `❌ Error cleaning up orphaned rows in \`${table}\`:`,
      error.message
    );
    throw error;
  }
}

// Step 11: Rename 'monthly_weekday' to 'monthly_weekdays'
async function renameMonthlyWeekdayColumn(conn) {
  try {
    console.log("🔄 Renaming column 'monthly_weekday' to 'monthly_weekdays' in reminder table...");
    
    // Check if old column exists
    const [existing] = await conn.query(`
      SHOW COLUMNS FROM reminder LIKE 'monthly_weekday';
    `);

    if (existing.length > 0) {
      await conn.query(`
        ALTER TABLE reminder
        CHANGE COLUMN monthly_weekday monthly_weekdays TEXT NULL;
      `);
      console.log("✅ Column renamed from 'monthly_weekday' to 'monthly_weekdays'");
    } else {
      console.log("ℹ️ Column 'monthly_weekday' does not exist. Skipping rename.");
    }
  } catch (error) {
    console.error("❌ Error renaming column:", error.message);
    throw error;
  }
}

// Step 11: Change file_url column in notification table from TEXT to VARCHAR(100)
async function updateNotificationFileUrlColumn(conn) {
  try {
    console.log("🔄 Updating 'file_url' column in notification table...");

    // Check current column definition
    const [columns] = await conn.query(`
      SHOW COLUMNS FROM notifications LIKE 'file_url';
    `);

    if (columns.length === 0) {
      console.log("❌ Column 'file_url' does not exist in notification table.");
      return;
    }

    const currentType = columns[0].Type; // e.g., 'text', 'varchar(255)', etc.

    if (currentType === 'varchar(100)') {
      console.log("ℹ️ Column 'file_url' is already of type VARCHAR(100). Skipping.");
      return;
    }

    // Alter the column type to VARCHAR(255)
    await conn.query(`
      ALTER TABLE notifications
      MODIFY COLUMN file_url VARCHAR(255) NULL COMMENT 'URL or path of associated file';
    `);

    console.log("✅ Column 'file_url' changed from TEXT to VARCHAR(255).");

  } catch (error) {
    console.error("❌ Error updating 'file_url' column:", error.message);
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
    await renameMonthlyWeekdayColumn(conn);

    // Step 2: Update notification table
    await updateNotificationFileUrlColumn(conn);
    
    await conn.commit();
    console.log("🎉 Migration completed successfully.");
  } catch (err) {
    await conn.rollback();
    console.error("💥 Migration failed:", err.message);
  } finally {
    conn.release();
  }
})();
