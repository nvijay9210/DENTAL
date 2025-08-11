const pool = require("../config/db");
/**
 * Safely renames a column only if old column exists and new column doesn't.
 */
async function renameColumnIfSafe(
  pool,
  table,
  oldName,
  newName,
  columnDefinition
) {
  try {
    const [oldCol] = await pool.query("SHOW COLUMNS FROM ?? LIKE ?", [
      table,
      oldName,
    ]);
    const [newCol] = await pool.query("SHOW COLUMNS FROM ?? LIKE ?", [
      table,
      newName,
    ]);

    if (newCol.length > 0) {
      console.log(
        `ℹ️ Column \`${newName}\` already exists in \`${table}\`. Skipping rename.`
      );
      return;
    }

    if (oldCol.length === 0) {
      console.log(
        `ℹ️ Column \`${oldName}\` does not exist in \`${table}\`. Skipping rename.`
      );
      return;
    }

    await pool.query(
      `ALTER TABLE ?? CHANGE COLUMN ?? ?? ${columnDefinition};`,
      [table, oldName, newName]
    );
    console.log(
      `✅ Renamed column from \`${oldName}\` to \`${newName}\` in \`${table}\``
    );
  } catch (error) {
    console.error(
      `❌ Error renaming column \`${oldName}\` in \`${table}\`:`,
      error.message
    );
    throw error;
  }
}

/**
 * Safely adds a column only if it doesn't exist.
 */
async function addColumnIfNotExists(
  pool,
  table,
  column,
  definition,
  comment = ""
) {
  try {
    const [existing] = await pool.query("SHOW COLUMNS FROM ?? LIKE ?", [
      table,
      column,
    ]);

    if (existing.length > 0) {
      console.log(
        `ℹ️ Column \`${column}\` already exists in \`${table}\`. Skipping.`
      );
      return;
    }

    let query = `ALTER TABLE ?? ADD COLUMN ?? ${definition}`;
    if (comment) {
      query += ` COMMENT '${comment}'`;
    }

    await pool.query(query, [table, column]);
    console.log(`✅ Added column \`${column}\` to \`${table}\``);
  } catch (error) {
    console.error(
      `❌ Error adding column \`${column}\` to \`${table}\`:`,
      error.message
    );
    throw error;
  }
}

/**
 * Safely modifies a column type only if current type is different.
 */
async function modifyColumnTypeIfNotMatch(
  pool,
  table,
  column,
  targetType,
  comment = ""
) {
  try {
    const [colInfo] = await pool.query("SHOW COLUMNS FROM ?? LIKE ?", [
      table,
      column,
    ]);

    if (colInfo.length === 0) {
      console.log(`❌ Column \`${column}\` does not exist in \`${table}\`.`);
      return;
    }

    const currentType = colInfo[0].Type.toUpperCase();
    const targetUpper = targetType.toUpperCase();

    if (currentType === targetUpper) {
      console.log(
        `ℹ️ Column \`${column}\` in \`${table}\` already matches type: ${targetUpper}. Skipping.`
      );
      return;
    }

    let query = `ALTER TABLE ?? MODIFY COLUMN ?? ${targetType}`;
    if (comment) {
      query += ` COMMENT '${comment}'`;
    }

    await pool.query(query, [table, column]);
    console.log(
      `✅ Modified column \`${column}\` in \`${table}\` from \`${currentType}\` to \`${targetType}\``
    );
  } catch (error) {
    console.error(
      `❌ Error modifying column \`${column}\` in \`${table}\`:`,
      error.message
    );
    throw error;
  }
}

/**
 * Safely drops a column only if it exists.
 */
async function dropColumnIfExists(pool, table, column) {
  try {
    const [existing] = await pool.query("SHOW COLUMNS FROM ?? LIKE ?", [
      table,
      column,
    ]);

    if (existing.length === 0) {
      console.log(
        `ℹ️ Column \`${column}\` does not exist in \`${table}\`. Skipping.`
      );
      return;
    }

    await pool.query("ALTER TABLE ?? DROP COLUMN ??", [table, column]);
    console.log(`✅ Dropped column \`${column}\` from \`${table}\``);
  } catch (error) {
    console.error(
      `❌ Error dropping column \`${column}\` from \`${table}\`:`,
      error.message
    );
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
    console.log(
      `✅ Dropped FOREIGN KEY \`${fkName}\` on \`${table}.${column}\``
    );
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
    if (indexName !== "PRIMARY") {
      await conn.query(`ALTER TABLE ?? DROP INDEX ??`, [table, indexName]);
      console.log(
        `✅ Dropped INDEX \`${indexName}\` on \`${table}.${column}\``
      );
    }
  }

  if (indexResults.length === 0) {
    console.log(`ℹ️ No index found on \`${table}.${column}\``);
  }
}

/**
 * Safely adds an index only if it doesn't already exist.
 */
async function addIndexIfNotExists(pool, table, indexName, columns) {
  try {
    const [indexes] = await pool.query(
      `SHOW INDEX FROM ?? WHERE Key_name = ?`,
      [table, indexName]
    );

    if (indexes.length > 0) {
      console.log(
        `ℹ️ Index \`${indexName}\` already exists on \`${table}\`. Skipping.`
      );
      return;
    }

    const columnList = columns.map((col) => `\`${col}\``).join(", ");
    const query = `ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (${columnList})`;

    await pool.query(query);
    console.log(
      `✅ Added index \`${indexName}\` on \`${table}\` (${columns.join(", ")})`
    );
  } catch (error) {
    console.error(
      `❌ Error adding index \`${indexName}\` on \`${table}\`:`,
      error.message
    );
    throw error;
  }
}

//--------------------- Apply Queries-----------------------------------

async function addAppointmentIndex(conn) {
  await addIndexIfNotExists(
    conn,
    "appointment",
    "idx_tenant_date_time_status",
    ["tenant_id", "appointment_date", "start_time", "status"]
  );
}
async function addAppointmentIndex(conn) {
  await addIndexIfNotExists(
    conn,
    "appointment",
    "idx_tenant_date_time_status",
    ["tenant_id", "appointment_date", "start_time", "status"]
  );
}
async function addDescriptionInDocumet(conn) {
  await addColumnIfNotExists(
    conn,
    "document",
    "description",
    "VARCHAR(255) NULL",
    "Add new description field"
  );
}
async function addProfilePictureInDentist(conn) {
  await addColumnIfNotExists(
    conn,
    "dentist",
    "profile_picture",
    "VARCHAR(255) NULL",
    "Add new ProfilePicture field"
  );
}
async function removeExpenseDocumentField(conn) {
  await dropColumnIfExists(
    conn,
    "expense",
    "expense_documents",
  );
}

async function removeUnwantedFields(conn) {
  // Dentist table
  await dropColuadmnIfExists(conn, "dentist", "profile_picture");
  await dropColumnIfExists(conn, "dentist", "awards_certifications");

  // Patient table
  await dropColumnIfExists(conn, "patient", "profile_picture");
  await dropColumnIfExists(conn, "clinic", "clinic_logo");
  await dropColumnIfExists(conn, "reception", "profile_picture");
  await dropColumnIfExists(conn, "supplier", "logo_url");
  await dropColumnIfExists(conn, "supplier_products", "image_url");
  await dropColumnIfExists(conn, "notifications", "file_url");
  await dropColumnIfExists(conn, "treatment", "treatment_images");
}


// Main migration runner
(async () => {
  const conn = await pool.getConnection();
  try {
    console.log("🔌 Connected to database. Starting migration...");

    await conn.beginTransaction();

    // Run migrations
    await addAppointmentIndex(conn);
    // await removeExpenseDocumentField(conn);
    // await removeUnwantedFields(conn);
    await addDescriptionInDocumet(conn);
    await addProfilePictureInDentist(conn);

    await conn.commit();
    console.log("🎉 Migration completed successfully.");
  } catch (err) {
    await conn.rollback();
    console.error("💥 Migration failed:", err.message);
  } finally {
    conn.release();
  }
})();
