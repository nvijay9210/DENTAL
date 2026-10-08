const pool = require("../config/db");
const { userQuery } = require("../query/userQuery");

// ============================================================
// CREATE USER
// ============================================================

const createUser = async (data) => {
  const conn = await pool.getConnection();

  try {
    const {
      keycloak_id,
      username = null,
      email = null,
      status = 1,
      created_by = "SYSTEM",
    } = data;

    const [result] = await conn.query(
      userQuery.createUser,
      [
        keycloak_id,
        username,
        email,
        status,
        created_by,
      ]
    );

    return result.insertId;
  } catch (error) {
    console.error(
      "Error creating user:",
      error
    );

    throw error;
  } finally {
    conn.release();
  }
};

// ============================================================
// GET ALL USERS
// ============================================================

const getAllUsers = async () => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      userQuery.getAllUsers
    );

    return rows;
  } catch (error) {
    console.error(
      "Error fetching users:",
      error
    );

    throw error;
  } finally {
    conn.release();
  }
};

// ============================================================
// GET USER BY ID
// ============================================================

const getUserById = async (userId) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      userQuery.getUserById,
      [userId]
    );

    return rows[0] || null;
  } catch (error) {
    console.error(
      "Error fetching user by ID:",
      error
    );

    throw error;
  } finally {
    conn.release();
  }
};

// ============================================================
// GET USER BY KEYCLOAK ID
// ============================================================

const getUserByKeycloakId = async (keycloakId) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      userQuery.getUserByKeycloakId,
      [keycloakId]
    );

    return rows[0] || null;
  } catch (error) {
    console.error(
      "Error fetching user by Keycloak ID:",
      error
    );

    throw error;
  } finally {
    conn.release();
  }
};

// ============================================================
// CHECK KEYCLOAK ID EXISTS
// ============================================================

const checkKeycloakIdExists = async (keycloakId) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      userQuery.checkKeycloakIdExists,
      [keycloakId]
    );

    return rows.length > 0;
  } finally {
    conn.release();
  }
};

// ============================================================
// CHECK USERNAME EXISTS
// ============================================================

const checkUsernameExists = async (username) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      userQuery.checkUsernameExists,
      [username]
    );

    return rows.length > 0;
  } finally {
    conn.release();
  }
};

// ============================================================
// CHECK USERNAME EXISTS EXCLUDE USER
// ============================================================

const checkUsernameExistsExcludeUser = async (
  username,
  userId
) => {
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      userQuery.checkUsernameExistsExcludeUser,
      [
        username,
        userId,
      ]
    );

    return rows.length > 0;
  } finally {
    conn.release();
  }
};

// ============================================================
// CHECK EMAIL EXISTS
// ============================================================

const checkEmailExists = async (email) => {
  if (!email) {
    return false;
  }

  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      userQuery.checkEmailExists,
      [email]
    );

    return rows.length > 0;
  } finally {
    conn.release();
  }
};

// ============================================================
// CHECK EMAIL EXISTS EXCLUDE USER
// ============================================================

const checkEmailExistsExcludeUser = async (
  email,
  userId
) => {
  if (!email) {
    return false;
  }

  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query(
      userQuery.checkEmailExistsExcludeUser,
      [
        email,
        userId,
      ]
    );

    return rows.length > 0;
  } finally {
    conn.release();
  }
};

// ============================================================
// UPDATE USER
// ============================================================

const updateUser = async (
  userId,
  data
) => {
  const conn = await pool.getConnection();

  try {
    const {
      username = null,
      email = null,
      status = 1,
      updated_by = "SYSTEM",
    } = data;

    const [result] = await conn.query(
      userQuery.updateUser,
      [
        username,
        email,
        status,
        updated_by,
        userId,
      ]
    );

    return result.affectedRows;
  } catch (error) {
    console.error(
      "Error updating user:",
      error
    );

    throw error;
  } finally {
    conn.release();
  }
};

// ============================================================
// UPDATE USER STATUS
// ============================================================

const updateUserStatus = async (
  userId,
  status,
  updatedBy = "SYSTEM"
) => {
  const conn = await pool.getConnection();

  try {
    const [result] = await conn.query(
      userQuery.updateUserStatus,
      [
        status,
        updatedBy,
        userId,
      ]
    );

    return result.affectedRows;
  } finally {
    conn.release();
  }
};

// ============================================================
// DELETE USER
// ============================================================

const deleteUser = async (userId) => {
  const conn = await pool.getConnection();

  try {
    const [result] = await conn.query(
      userQuery.deleteUser,
      [userId]
    );

    return result.affectedRows;
  } catch (error) {
    console.error(
      "Error deleting user:",
      error
    );

    throw error;
  } finally {
    conn.release();
  }
};

// ============================================================
// GET COMPLETE USER DETAILS BY USERNAME
//
// users
//   ↓
// user_roles
//   ↓
// roles
//   ↓
// tenant
//   ↓
// clinic
//   ↓
// role based profile
//
// NO userclinic table
// NO Prisma
// ============================================================

const getUserDetailsByUsername = async (
  username
) => {
  if (!username) {
    return null;
  }

  const conn = await pool.getConnection();

  try {
    const normalizedUsername =
      username.toLowerCase().trim();

    // ========================================================
    // 1. USER + ROLE + TENANT + CLINIC
    // ========================================================

    const [rows] = await conn.query(
      `
      SELECT
        u.user_id,
        u.keycloak_id,
        u.username,
        u.email,
        u.status,

        ur.user_role_id,
        ur.role_id,
        ur.tenant_id,
        ur.clinic_id,
        ur.is_primary,

        r.role_code,
        r.role_name,

        t.tenant_name,
        t.tenant_domain,
        t.tenant_app_logo,
        t.tenant_app_themes,
        t.tenant_app_font,

        c.clinic_name,
        c.clinic_app_themes,
        c.clinic_app_font,
        c.clinic_logo

      FROM users u

      INNER JOIN user_roles ur
        ON ur.user_id = u.user_id
        AND ur.status = 1

      INNER JOIN roles r
        ON r.role_id = ur.role_id
        AND r.status = 1

      LEFT JOIN tenant t
        ON t.tenant_id = ur.tenant_id

      LEFT JOIN clinic c
        ON c.clinic_id = ur.clinic_id

      WHERE
        u.username = ?
        AND u.status = 1

      ORDER BY
        ur.is_primary DESC,
        ur.user_role_id ASC
      `,
      [normalizedUsername]
    );

    // ========================================================
    // USER NOT FOUND
    // ========================================================

    if (!rows.length) {
      return null;
    }

    const firstRow = rows[0];

    // ========================================================
    // 2. ROLES
    // ========================================================

    const roles = rows.map((row) => ({
      user_role_id:
        row.user_role_id,

      role_id:
        row.role_id,

      role_code:
        row.role_code,

      role_name:
        row.role_name,

      tenant_id:
        row.tenant_id,

      clinic_id:
        row.clinic_id,

      is_primary:
        Boolean(row.is_primary),
    }));

    // ========================================================
    // 3. PRIMARY ASSIGNMENT
    // ========================================================

    const primaryAssignment =
      rows.find(
        (row) =>
          Number(row.is_primary) === 1
      ) || rows[0];

    // ========================================================
    // 4. clinic
    // ========================================================

    const clinicMap = new Map();

    for (const row of rows) {
      if (!row.clinic_id) {
        continue;
      }

      if (!clinicMap.has(row.clinic_id)) {
        clinicMap.set(
          row.clinic_id,
          {
            clinic_id:
              row.clinic_id,

            tenant_id:
              row.tenant_id,

            clinic_name:
              row.clinic_name,

            clinic_app_themes:
              row.clinic_app_themes,

            clinic_app_font:
              row.clinic_app_font,

            clinic_logo:
              row.clinic_logo,

            is_primary:
              Boolean(row.is_primary),
          }
        );
      }
    }

    const clinic =
      Array.from(
        clinicMap.values()
      );

    // ========================================================
    // 5. tenant
    // ========================================================

    const tenantMap = new Map();

    for (const row of rows) {
      if (!row.tenant_id) {
        continue;
      }

      if (!tenantMap.has(row.tenant_id)) {
        tenantMap.set(
          row.tenant_id,
          {
            tenant_id:
              row.tenant_id,

            tenant_name:
              row.tenant_name,

            tenant_domain:
              row.tenant_domain,

            tenant_app_logo:
              row.tenant_app_logo,

            tenant_app_themes:
              row.tenant_app_themes,

            tenant_app_font:
              row.tenant_app_font,
          }
        );
      }
    }

    const tenant =
      Array.from(
        tenantMap.values()
      );

    // ========================================================
    // 6. PRIMARY ROLE
    // ========================================================

    const roleCode =
      primaryAssignment.role_code
        ?.toLowerCase() || null;

    // ========================================================
    // 7. ROLE BASED PROFILE
    // ========================================================

    let profile = null;

    switch (roleCode) {

      // ------------------------------------------------------
      // DENTIST
      // ------------------------------------------------------

      case "dentist": {
        const [profileRows] =
          await conn.query(
            `
            SELECT *
            FROM dentist
            WHERE user_id = ?
            LIMIT 1
            `,
            [firstRow.user_id]
          );

        profile =
          profileRows[0] || null;

        break;
      }

      // ------------------------------------------------------
      // RECEPTION
      // ------------------------------------------------------

      case "reception":
      case "receptionist": {
        const [profileRows] =
          await conn.query(
            `
            SELECT *
            FROM reception
            WHERE user_id = ?
            LIMIT 1
            `,
            [firstRow.user_id]
          );

        profile =
          profileRows[0] || null;

        break;
      }

      // ------------------------------------------------------
      // SUPERUSER
      // ------------------------------------------------------

      case "superuser": {
        const [profileRows] =
          await conn.query(
            `
            SELECT *
            FROM superuser
            WHERE user_id = ?
            LIMIT 1
            `,
            [firstRow.user_id]
          );

        profile =
          profileRows[0] || null;

        break;
      }

      // ------------------------------------------------------
      // SUPPLIER
      // ------------------------------------------------------

      case "supplier": {
        const [profileRows] =
          await conn.query(
            `
            SELECT *
            FROM supplier
            WHERE user_id = ?
            LIMIT 1
            `,
            [firstRow.user_id]
          );

        profile =
          profileRows[0] || null;

        break;
      }

      // ------------------------------------------------------
      // PATIENT
      // ------------------------------------------------------

      case "patient": {
        const [profileRows] =
          await conn.query(
            `
            SELECT *
            FROM patient
            WHERE user_id = ?
            LIMIT 1
            `,
            [firstRow.user_id]
          );

        profile =
          profileRows[0] || null;

        break;
      }

      // ------------------------------------------------------
      // UNKNOWN ROLE
      // ------------------------------------------------------

      default:
        profile = null;
        break;
    }

    // ========================================================
    // 8. FINAL USER DETAILS
    // ========================================================

    return {
      user_id:
        firstRow.user_id,

      keycloak_id:
        firstRow.keycloak_id,

      username:
        firstRow.username,

      email:
        firstRow.email,

      status:
        firstRow.status,

      // ------------------------------------------------------
      // PRIMARY ROLE
      // ------------------------------------------------------

      role: {
        role_id:
          primaryAssignment.role_id,

        role_code:
          primaryAssignment.role_code,

        role_name:
          primaryAssignment.role_name,
      },

      // ------------------------------------------------------
      // ALL ROLE ASSIGNMENTS
      // ------------------------------------------------------

      roles,

      // ------------------------------------------------------
      // ROLE PROFILE
      // ------------------------------------------------------

      profile,

      // ------------------------------------------------------
      // tenant
      // ------------------------------------------------------

      tenant,

      // ------------------------------------------------------
      // clinic
      // ------------------------------------------------------

      clinic,

      // ------------------------------------------------------
      // PRIMARY IDS
      // ------------------------------------------------------

      primary_tenant_id:
        primaryAssignment.tenant_id ||
        null,

      primary_clinic_id:
        primaryAssignment.clinic_id ||
        null,

      primary_role_id:
        primaryAssignment.role_id ||
        null,
    };

  } catch (error) {
    console.error(
      "Error fetching complete user details:",
      error
    );

    throw error;
  } finally {
    conn.release();
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  getUserByKeycloakId,
  checkKeycloakIdExists,
  checkUsernameExists,
  checkUsernameExistsExcludeUser,
  checkEmailExists,
  checkEmailExistsExcludeUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  getUserDetailsByUsername,
};