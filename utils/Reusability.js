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
} = require("../middlewares/KeycloakAdmin");
const { mapFields } = require("../query/Records");
const { updateDocumentsDiffBased, saveDocuments } = require("./UploadFiles");
const helper = require("../utils/Helpers");

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

const splitName = (name) => {
  if (typeof name !== "string" || !name.trim()) {
    return { firstName: null, lastName: null };
  }

  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts.shift(),
    lastName: parts.join(" "),
  };
};

/**
 * Reusable entity creation function
 * @param {Object} options
 */
const createEntity = async ({
    entityName, // 'patient', 'dentist', 'reception', 'supplier', etc.
    data,
    token,
    realm,
    fieldMap, // DB mapping fields
    createModel, // async function(connection, tableName, columns, values)
    userClinicId = null, // optional for patient
    roleName = null, // Keycloak role: 'patient', 'dentist', 'reception', etc.
    fileFields = [], // optional: ["awards_certifications"]
    connectionPool = pool,
  }) => {
    const create = { ...fieldMap, created_by: (val) => val };
  
    let userId = null;
    let username = null;
    let rawPassword = null;
    let entityId = null;
  
    const connection = await connectionPool.getConnection();
    try {
      await connection.beginTransaction();
  
      // 1️⃣ Handle Keycloak user creation
      if (process.env.KEYCLOAK_POWER === "on") {
        let firstName, lastName;
  
        // Map names depending on entity
        if (entityName === "supplier") {
          ({ firstName, lastName } = splitName(data.name));
        } else if (entityName === "reception") {
          ({ firstName, lastName } = splitName(data.full_name));
        } else {
          firstName = data.first_name;
          lastName = data.last_name;
        }
  
        // Check if user exists by email
        const user = await getKeycloakUserIdByEmail(token, realm, data.email);
        userId = user?.id;
  
        if (userId) {
          console.log(`ℹ️ Keycloak user already exists: ${data.email}`);
  
          // Assign role if not exists
          if (roleName) {
            await assignRealmRoleToUser(token, realm, userId, roleName);
          }
  
          // Assign group if clinic_id provided
          if (userClinicId) {
            const groupName = `dental-${data.tenant_id}-${userClinicId}`;
            const userGroups = await getUserGroups(token, realm, userId);
            const groupExists = userGroups.some(
              (grp) => grp.path === `/${groupName}`
            );
            if (!groupExists) {
              await addUserToGroup(token, realm, userId, groupName);
            }
          }
  
          data.keycloak_id = userId;
          data.username=user.username
  
          // For patients: check if patient exists in DB
          if (entityName === "patient") {
            const existingPatient = await createModel.getPatientByKeycloakId(
              data.keycloak_id,
              connection
            );
  
            if (!existingPatient) {
              throw new CustomError(
                "Existing patient record not found in DB",
                404
              );
            }
  
            entityId = existingPatient.patient_id;
          }
        } else {
          // 2️⃣ New Keycloak user
          username = await helper.generateUsername(
            entityName.slice(0, 3).toUpperCase(),
            realm,
            token
          );
          rawPassword = helper.generateAlphanumericPassword(12);
          const encryptedPassword = helper.encrypt(rawPassword).content;
  
          const email =
            data.email ||
            `${username}${helper.generateAlphanumericPassword()}@gmail.com`;
  
          const userData = {
            username,
            email,
            emailVerified: true,
            firstName,
            lastName,
            credentials: [
              { type: "password", value: rawPassword, temporary: false },
            ],
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
  
          // Assign group if clinic_id provided
          if (userClinicId) {
            const groupName = `dental-${data.tenant_id}-${userClinicId}`;
            const groupAdded = await addUserToGroup(
              token,
              realm,
              userId,
              groupName
            );
            if (!groupAdded)
              console.warn(`⚠️ Failed to add user to group: ${groupName}`);
          }
  
          data.keycloak_id = userId;
          data.username = username;
          data.password = encryptedPassword;
        }
      }
  
      // 3️⃣ Insert entity record into DB if not existing (patients can skip if already exist)
      if (!entityId) {
        const { columns, values } = mapFields(data, create);
        entityId = await createModel(connection, entityName, columns, values);
      }
  
      // 4️⃣ Handle patient_clinic creation if patient
      if (entityName === "patient" && userClinicId) {
        await createModel.createPatientClinic(
          {
            patient_id: entityId,
            clinic_id: userClinicId,
            created_by: data.created_by,
          },
          connection
        );
      }
  
      // 5️⃣ Handle files if any
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
  
      // 6️⃣ Commit & invalidate cache
      await connection.commit();
      await invalidateCacheByPattern(`${entityName}:*`);
      if (entityName === "dentist" || entityName === "patient") {
        await invalidateCacheByPattern(`${entityName}:clinic:*`);
      }
  
      return {
        entityId,
        username: username || null,
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
    entityName, // 'reception', 'supplier', 'patient', etc.
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
  
      const { columns: rawColumns, values: rawValues } = mapFields(
        sanitizedData,
        { ...fieldMap, updated_by: (val) => val }
      );
  
      const columns = [];
      const values = [];
      rawColumns.forEach((col, idx) => {
        if (rawValues[idx] !== undefined) {
          columns.push(col);
          values.push(rawValues[idx]);
        }
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
  
        if (process.env.KEYCLOAK_POWER === "on" && userId) {
          await syncToKeycloak({
            token,
            realm,
            userId,
            entityName,
            data: sanitizedData,
          });
        }
  
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
  

  const syncToKeycloak = async ({
    token,
    realm,
    userId,
    entityName,
    data,
  }) => {
    const payload = {};
  
    if (data.email) {
      payload.email = data.email;
      payload.emailVerified = true;
    }
  
    if (entityName === "reception" && data.full_name) {
      const [firstName, ...rest] = data.full_name.trim().split(" ");
      payload.firstName = firstName;
      payload.lastName = rest.length > 0 ? rest.join(" ") : "-";
    }
  
    if (entityName === "supplier" && data.name) {
      const [firstName, ...rest] = data.name.trim().split(" ");
      payload.firstName = firstName;
      payload.lastName = rest.length > 0 ? rest.join(" ") : "-";
    }
  
    if (Object.keys(payload).length === 0) return;
  
    try {
      await updateUserInKeycloak(token, realm, userId, payload);
      console.log(`✅ Synced ${entityName} keycloakId ${userId}`, payload);
    } catch (kcError) {
      console.warn(
        `⚠️ Keycloak sync failed for ${entityName} keycloakId ${userId}:`,
        kcError.message
      );
      // Do not rollback DB
    }
  };
  

module.exports = { updateEntity, createEntity };
