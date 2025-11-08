const pool = require("../config/db");
const { invalidateCacheByPattern } = require("../config/redisConfig");
const { rollbackKeycloakUser } = require("../Keycloak/KeycloakService");
const { CustomError } = require("../middlewares/CustomeError");
const {
  updateUserInKeycloak,
  getKeycloakUserIdByEmail,
  assignRealmRoleToUser,
  getUserGroups,
  addUserToGroup,
  addUser,
  getUserIdByUsername,
} = require("../Keycloak/KeycloakAdmin");
const { mapFields } = require("../query/Records");
const { updateDocumentsDiffBased } = require("./UploadFiles");
const helper = require("../utils/Helpers");
const { createPatientClinic } = require("../services/PatientClinicService");
const { getPatientByKeycloakId } = require("../models/PatientModel");
const { generateCode } = require("./CodeGenerator");

/**
 * Sanitize object by removing undefined fields
 */
const sanitizeFields = (data) => {
  const sanitized = {};
  for (const key in data) {
    if (data[key] !== undefined) {
      sanitized[key] = data[key];
    }
  }
  return sanitized;
};

const createEntity = async ({
  entityName,
  data,
  token,
  realm,
  fieldMap,
  createModel,
  userClinicId = null,
  roleName = null,
  createPatientClinicFn = null,
  fileFields = [],
  connectionPool = pool,
  clientId,
}) => {
  const create = { ...fieldMap, created_by: (val) => val }; // DB mapping (no phone_number)
  let userId = null;
  let username = null;
  let rawPassword = "1234";
  let entityId = null;
  userClinicId = data.clinic_id;

  const connection = await connectionPool.getConnection();
  try {
    await connection.beginTransaction();

    if (process.env.KEYCLOAK_POWER === "on") {
      const { first_name, last_name, email, phone_number } = data;

      // Check if Keycloak user exists by email
      // const user = await getKeycloakUserIdByEmail(token, realm, email);
      // userId = user?.id;

      // if (userId) {
      //   console.log(`ℹ️ Keycloak user already exists: ${email}`);

      //   if (roleName) await assignRealmRoleToUser(token, realm, userId, roleName);

      //   if (userClinicId) {
      //     const groupName = `dental-${data.tenant_id}-${userClinicId}`;
      //     const userGroups = await getUserGroups(token, realm, userId);
      //     if (!userGroups.some((grp) => grp.path === `/${groupName}`)) {
      //       await addUserToGroup(token, realm, userId, groupName);
      //     }
      //   }

      //   data.keycloak_id = userId;
      //   data.username = user.username || user.email;

      //   const existingPatient = await getPatientByKeycloakId(userId, connection);
      //   if (existingPatient) entityId = existingPatient.patient_id;

      //   // Sync Keycloak fields
      //   const payload = {};
      //   if (email) { payload.email = email; payload.emailVerified = true; }
      //   if (first_name) payload.firstName = first_name;
      //   if (last_name) payload.lastName = last_name;
      //   if (phone_number) payload.attributes = { phoneNumber: phone_number };

      //   if (Object.keys(payload).length > 0) {
      //     await updateUserInKeycloak(token, realm, userId, payload);
      //     console.log(`✅ Updated Keycloak user ${userId} with new info`);
      //   }
      // } else {
      // Create new Keycloak user
      let code;
      switch (entityName) {
        case "superuser":
          code = "SUP";
          break;
        case "dentist":
          code = "DEN";
          break;
        case "patient":
          code = "PAT";
          break;
        case "receptionist":
          code = "REC";
          break;
        case "supplier":
          code = "SPL";
          break;
      }
      username = await helper.generateUsername(code, realm, token);
      rawPassword = rawPassword || helper.generateAlphanumericPassword(12);

      const userEmail =
        email ||
        `${username}${helper.generateAlphanumericPassword(6)}@example.com`;

      const userData = {
        username,
        email: userEmail || "",
        emailVerified: true,
        firstName: first_name,
        lastName: last_name,
        attributes: {
          phoneNumber: phone_number || "",
          tenant_id: data.tenant_id || "",
          clinic_id: data.clinic_id || "",
        },
        password: rawPassword,
      };

      const isUserCreated = await addUser(token, realm, userData);
      if (!isUserCreated)
        throw new CustomError("Keycloak user creation failed", 400);

      userId = await getUserIdByUsername(token, realm, username);
      if (!userId)
        throw new CustomError("Could not fetch Keycloak user ID", 400);

      if (roleName) {
        const roleAssigned = await assignRealmRoleToUser(
          token,
          realm,
          userId,
          roleName
        );
        if (!roleAssigned)
          throw new CustomError(`Failed to assign '${roleName}' role`, 400);
      }

      if (userClinicId) {
        const groupName = `dental-${data.tenant_id}-${userClinicId}`;
        await addUserToGroup(token, realm, userId, groupName);
      }

      data.keycloak_id = userId;
      data.username = username;
      data.password = rawPassword;
      // }
    }

    // Insert entity in DB
    const { columns, values } = mapFields(data, create);
    entityId = await createModel(connection, entityName, columns, values);

    // Generate unique code
    const tenantName = clientId || data.tenant_name;
    const code = generateCode(tenantName, entityName, entityId);
    const codeColumn = `${entityName}_code`;
    await connection.query(
      `UPDATE ${entityName} SET ${codeColumn} = ? WHERE ${entityName}_id = ?`,
      [code, entityId]
    );

    if (entityName === "patient" && userClinicId) {
      await createPatientClinicFn(
        {
          patient_id: entityId,
          clinic_id: userClinicId,
          created_by: data.created_by,
        },
        connection
      );
    }

    for (const field of fileFields) {
      if (data[field]?.length || data.deletedFileIds?.length) {
        await updateDocumentsDiffBased({
          table_name: entityName,
          table_id: entityId,
          field_name: field,
          newFiles: data[field] || [],
          deletedFileIds: data.deletedFileIds || [],
          created_by: data.created_by,
          updated_by: data.updated_by,
          descriptions: data.descriptions,
        });
      }
    }

    await connection.commit();
    await invalidateCacheByPattern(`${entityName}:*`);
    await invalidateCacheByPattern(`${entityName}:clinic:*`);

    return {
      entityId,
      code: data.code,
      username: username || data.username || null,
      password: rawPassword || "Existing user – password not returned",
    };
  } catch (error) {
    await connection.rollback();
    if (process.env.KEYCLOAK_POWER === "on" && userId && !data.keycloak_id) {
      try {
        await rollbackKeycloakUser(token, realm, userId);
        console.log(`♻️ Rolled back Keycloak user: ${userId}`);
      } catch (rollbackErr) {
        console.error("❌ Failed to rollback Keycloak user:", rollbackErr);
      }
    }
    throw new CustomError(
      `Failed to create ${entityName}: ${error.message}`,
      500
    );
  } finally {
    connection.release();
  }
};

const updateEntity = async ({
  entityId,
  entityName,
  tenantId,
  data,
  token,
  realm,
  fieldMap,
  getModelById,
  updateModel,
  fileFields = [],
  connectionPool = pool,
}) => {
  const sanitizedData = sanitizeFields(data);
  const connection = await connectionPool.getConnection();
  let userId = null;

  try {
    await connection.beginTransaction();

    const entity = await getModelById(tenantId, entityId, connection);
    if (!entity) throw new CustomError(`${entityName} not found`, 404);

    userId = entity.keycloak_id;

    const { columns, values } = mapFields(sanitizedData, {
      ...fieldMap,
      updated_by: (val) => val,
    });

    let affectedRows = 0;

    if (columns.length > 0) {
      affectedRows = await updateModel(
        entityId,
        columns,
        values,
        tenantId,
        connection
      );

      // ✅ Check for Keycloak field changes
      const keycloakFieldsChanged =
        (sanitizedData.email && sanitizedData.email !== entity.email) ||
        (sanitizedData.phone_number &&
          sanitizedData.phone_number !== entity.phone_number) ||
        (sanitizedData.first_name &&
          sanitizedData.first_name !== entity.first_name) ||
        (sanitizedData.last_name &&
          sanitizedData.last_name !== entity.last_name);

      if (
        process.env.KEYCLOAK_POWER === "on" &&
        userId &&
        keycloakFieldsChanged
      ) {
        const payload = {};

        if (sanitizedData.email && sanitizedData.email !== entity.email) {
          payload.email = sanitizedData.email;
          payload.emailVerified = true;
        }
        if (
          sanitizedData.first_name &&
          sanitizedData.first_name !== entity.first_name
        ) {
          payload.firstName = sanitizedData.first_name;
        }
        if (
          sanitizedData.last_name &&
          sanitizedData.last_name !== entity.last_name
        ) {
          payload.lastName = sanitizedData.last_name;
        }
        if (
          sanitizedData.phone_number &&
          sanitizedData.phone_number !== entity.phone_number
        ) {
          payload.attributes = { phoneNumber: sanitizedData.phone_number };
        }

        if (Object.keys(payload).length > 0) {
          console.log("🔁 Updating user in Keycloak due to changed fields...");
          await updateUserInKeycloak(token, realm, userId, payload);
          console.log(`✅ Synced Keycloak user ${userId} with updated fields`);
        }
      }

      // 🔄 Handle file updates (unchanged)
      for (const field of fileFields) {
        const newFiles = Array.isArray(sanitizedData[field])
          ? sanitizedData[field]
          : [];
        const deletedFileIds = Array.isArray(sanitizedData.deletedFileIds)
          ? sanitizedData.deletedFileIds
          : [];
        if (newFiles.length || deletedFileIds.length) {
          await updateDocumentsDiffBased({
            table_name: entityName,
            table_id: entityId,
            field_name: field,
            newFiles,
            deletedFileIds,
            created_by: sanitizedData.created_by,
            updated_by: sanitizedData.updated_by,
            descriptions: sanitizedData.descriptions,
          });
        }
      }
    }

    await connection.commit();

    // 🧹 Invalidate caches
    await invalidateCacheByPattern(`${entityName}:*`);
    if (["dentist", "patient"].includes(entityName)) {
      await invalidateCacheByPattern(`${entityName}:clinic:*`);
    }

    return { affectedRows };
  } catch (error) {
    await connection.rollback();
    console.error(`❌ Update ${entityName} failed:`, error.message);
    throw new CustomError(
      `Failed to update ${entityName}: ${error.message}`,
      500
    );
  } finally {
    connection.release();
  }
};

/**
 * Fetch a user from a specified table by tenant_id, clinic_id, and keycloak_user_id
 * @param {string} tableName - e.g., 'superuser', 'dentist', 'patient'
 * @param {number} tenantId
 * @param {number} clinicId
 * @param {string} keycloakUserId
 * @returns {Promise<Object|null>} User object or null if not found
 */
const getUserByTenantClinicAndKeycloakId = async (
  tableName,
  tenantId,
  clinicId,
  keycloakUserId
) => {
  if (!tableName || !tenantId || !keycloakUserId) {
    throw new Error("Missing required parameters");
  }

  // ✅ Whitelist to prevent SQL injection
  const allowedTables = [
    "superuser",
    "dentist",
    "patient",
    "receptionist",
    "supplier",
  ];
  if (!allowedTables.includes(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }

  // ✅ receptionist table naming fix
  if (tableName === "receptionist") tableName = "reception";

  const conn = await pool.getConnection();
  try {
    let query;
    let params;

    if (tableName === "patient") {
      // ✅ Special case: check patient_clinic table for clinic filter
      query = `
        SELECT p.*
        FROM patient p
        JOIN patient_clinic pc ON pc.patient_id = p.patient_id
        WHERE p.tenant_id = ?
          AND pc.clinic_id = ?
          AND p.keycloak_id = ?
        LIMIT 1
      `;
      params = [tenantId, clinicId, keycloakUserId];
    } else {
      // ✅ Default logic for all other tables
      query = `
        SELECT * FROM ??
        WHERE tenant_id = ?
          AND clinic_id = ?
          AND keycloak_id = ?
        LIMIT 1
      `;
      params = [tableName, tenantId, clinicId, keycloakUserId];
    }

    const [rows] = await conn.query(query, params);
    return rows[0] || null;
  } catch (error) {
    console.error(`Error fetching user from ${tableName}:`, error);
    throw new Error("Database operation failed");
  } finally {
    conn.release();
  }
};

module.exports = {
  updateEntity,
  createEntity,
  getUserByTenantClinicAndKeycloakId,
};
