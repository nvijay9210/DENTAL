const pool = require("../config/db");
/**
 * Safely renames a column only if old column exists and new column doesn't.
 */
async function renameColumnIfSafe(pool, table, oldName, newName, columnDefinition) {
  try {
    const [oldCol] = await pool.query("SHOW COLUMNS FROM ?? LIKE ?", [table, oldName]);
    const [newCol] = await pool.query("SHOW COLUMNS FROM ?? LIKE ?", [table, newName]);

    if (newCol.length > 0) {
      console.log(`ℹ️ Column \`${newName}\` already exists in \`${table}\`. Skipping rename.`);
      return;
    }

    if (oldCol.length === 0) {
      console.log(`ℹ️ Column \`${oldName}\` does not exist in \`${table}\`. Skipping rename.`);
      return;
    }

    await pool.query(`ALTER TABLE ?? CHANGE COLUMN ?? ?? ${columnDefinition};`, [table, oldName, newName]);
    console.log(`✅ Renamed column from \`${oldName}\` to \`${newName}\` in \`${table}\``);
  } catch (error) {
    console.error(`❌ Error renaming column \`${oldName}\` in \`${table}\`:`, error.message);
    throw error;
  }
}

/**
 * Safely adds a column only if it doesn't exist.
 */
async function addColumnIfNotExists(pool, table, column, definition, comment = '') {
  try {
    const [existing] = await pool.query("SHOW COLUMNS FROM ?? LIKE ?", [table, column]);

    if (existing.length > 0) {
      console.log(`ℹ️ Column \`${column}\` already exists in \`${table}\`. Skipping.`);
      return;
    }

    let query = `ALTER TABLE ?? ADD COLUMN ?? ${definition}`;
    if (comment) {
      query += ` COMMENT '${comment}'`;
    }

    await pool.query(query, [table, column]);
    console.log(`✅ Added column \`${column}\` to \`${table}\``);
  } catch (error) {
    console.error(`❌ Error adding column \`${column}\` to \`${table}\`:`, error.message);
    throw error;
  }
}

/**
 * Safely modifies a column type only if current type is different.
 */
async function modifyColumnTypeIfNotMatch(pool, table, column, targetType, comment = '') {
  try {
    const [colInfo] = await pool.query("SHOW COLUMNS FROM ?? LIKE ?", [table, column]);

    if (colInfo.length === 0) {
      console.log(`❌ Column \`${column}\` does not exist in \`${table}\`.`);
      return;
    }

    const currentType = colInfo[0].Type.toUpperCase();
    const targetUpper = targetType.toUpperCase();

    if (currentType === targetUpper) {
      console.log(`ℹ️ Column \`${column}\` in \`${table}\` already matches type: ${targetUpper}. Skipping.`);
      return;
    }

    let query = `ALTER TABLE ?? MODIFY COLUMN ?? ${targetType}`;
    if (comment) {
      query += ` COMMENT '${comment}'`;
    }

    await pool.query(query, [table, column]);
    console.log(`✅ Modified column \`${column}\` in \`${table}\` from \`${currentType}\` to \`${targetType}\``);
  } catch (error) {
    console.error(`❌ Error modifying column \`${column}\` in \`${table}\`:`, error.message);
    throw error;
  }
}

/**
 * Safely drops a column only if it exists.
 */
async function dropColumnIfExists(pool, table, column) {
  try {
    const [existing] = await pool.query("SHOW COLUMNS FROM ?? LIKE ?", [table, column]);

    if (existing.length === 0) {
      console.log(`ℹ️ Column \`${column}\` does not exist in \`${table}\`. Skipping.`);
      return;
    }

    await pool.query("ALTER TABLE ?? DROP COLUMN ??", [table, column]);
    console.log(`✅ Dropped column \`${column}\` from \`${table}\``);
  } catch (error) {
    console.error(`❌ Error dropping column \`${column}\` from \`${table}\`:`, error.message);
    throw error;
  }
}

/**
 * Drops foreign key on a column if it exists
 */
async function dropForeignKeyAndIndexIfExists(conn, table, column) {
  // Find foreign key constraint name
  const [fkResults] = await conn.query(
    `SELECT CONSTRAINT_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_NAME = ?
       AND COLUMN_NAME = ?
       AND TABLE_SCHEMA = DATABASE()
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [table, column]
  );

  if (fkResults.length > 0) {
    const fkName = fkResults[0].CONSTRAINT_NAME;
    await conn.query(`ALTER TABLE ?? DROP FOREIGN KEY ??`, [table, fkName]);
    console.log(`✅ Dropped FOREIGN KEY \`${fkName}\` on \`${table}.${column}\``);
  } else {
    console.log(`ℹ️ No foreign key found on \`${table}.${column}\``);
  }

  // Find index on the column
  const [indexResults] = await conn.query(
    `SHOW INDEX FROM ?? WHERE Column_name = ?`,
    [table, column]
  );

  for (const row of indexResults) {
    const indexName = row.Key_name;
    // Avoid dropping PRIMARY key accidentally
    if (indexName !== 'PRIMARY') {
      await conn.query(`ALTER TABLE ?? DROP INDEX ??`, [table, indexName]);
      console.log(`✅ Dropped INDEX \`${indexName}\` on \`${table}.${column}\``);
    }
  }

  if (indexResults.length === 0) {
    console.log(`ℹ️ No index found on \`${table}.${column}\``);
  }
}




//--------------------- Apply Queries-----------------------------------

async function renameMonthlyWeekdayColumn(conn) {
  await renameColumnIfSafe(
    conn,
    "reminder",
    "monthly_weekday",
    "monthly_weekdays",
    "TEXT NULL COMMENT 'Monthly weekdays for reminder'"
  );
}

async function updateNotificationFileUrlColumn(conn) {
  await modifyColumnTypeIfNotMatch(
    conn,
    "notifications",
    "file_url",
    "VARCHAR(255) NULL",
    "URL or path of associated file"
  );
}

async function addColumnsToSupplierPayment(conn) {
  await addColumnIfNotExists(
    conn,
    "supplier_payments",
    "paid_amount",
    "DECIMAL(10,2) NULL",
    "Amount paid to supplier"
  );

  await addColumnIfNotExists(
    conn,
    "supplier_payments",
    "balance_amount",
    "DECIMAL(10,2) NULL",
    "Remaining balance amount"
  );

  await addColumnIfNotExists(
    conn,
    "supplier_payments",
    "supplier_payment_documents",
    "text NULL",
    "Supplier Payment documents"
  );
}
async function addColumnsToNotifications(conn) {
  await addColumnIfNotExists(
    conn,
    "notifications",
    "clinic_id",
    "int(11) NOT NULL",
    "clinic_id for super-user"
  );
 
}

async function dropToothDetailsColumn(conn) {
  await dropColumnIfExists(conn, "patient", "tooth_details");
}

async function updatePhoneFields(conn) {
  // Make phone_number NOT NULL in clinic
  await modifyColumnTypeIfNotMatch(
    conn,
    "clinic",
    "phone_number",
    "VARCHAR(15) NOT NULL",
    "Primary phone number of clinic"
  );

  // Make phone_number NOT NULL in reception
  await modifyColumnTypeIfNotMatch(
    conn,
    "reception",
    "phone_number",
    "VARCHAR(15) NOT NULL",
    "Primary phone number of reception"
  );

  // Make alternate_phone_number NULLABLE in supplier
  await modifyColumnTypeIfNotMatch(
    conn,
    "supplier",
    "alternate_phone_number",
    "VARCHAR(15) NULL",
    "Alternate contact number"
  );
}

async function addShowFieldReviews(conn) {
  await addColumnIfNotExists(
    conn,
    "appointment",
    "feedback_display",
    "TINYINT(1) NULL Default 1",
    "For Feedback Show or not"
  );
}

async function updatExpensePaid(conn) {
  
  await modifyColumnTypeIfNotMatch(
    conn,
    "expense",
    "paid_by",
    "VARCHAR(100) NOT NULL",
    "paid_by size change"
  );

  
  await modifyColumnTypeIfNotMatch(
    conn,
   "expense",
    "paid_by_user",
    "VARCHAR(100) NOT NULL",
    "paid_by_user size change"
  );

  
  await modifyColumnTypeIfNotMatch(
    conn,
    "expense",
    "paid_to",
    "VARCHAR(100) NOT NULL",
    "paid_to size change"
  );
}

async function deleteReminderDentistIdForeignkey(conn){
  await dropForeignKeyAndIndexIfExists(conn,'reminder','dentist_id')
  await modifyColumnTypeIfNotMatch(
    conn,
    "reminder",
    "dentist_id",
    "INT(11) NULL",
    "Alternate dentist_id key"
  );
}



// Main migration runner
(async () => {
  const conn = await pool.getConnection();
  try {
    console.log("🔌 Connected to database. Starting migration...");

    await conn.beginTransaction();

    // Run migrations

    await addColumnsToNotifications(conn)
    await deleteReminderDentistIdForeignkey(conn)

    await conn.commit();
    console.log("🎉 Migration completed successfully.");
  } catch (err) {
    await conn.rollback();
    console.error("💥 Migration failed:", err.message);
  } finally {
    conn.release();
  }
})();