const { CustomError } = require("../middlewares/CustomeError");
const receptionModel = require("../models/ReceptionModel");
const pool = require("../config/db");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");
const { encrypt } = require("../middlewares/PasswordHash");
const {
  addUser,
  getUserIdByUsername,
  assignRealmRoleToUser,
  addUserToGroup,
  updateUserInKeycloak,
} = require("../middlewares/KeycloakAdmin");
const { buildCacheKey } = require("../utils/RedisCache");
const { rollbackKeycloakUser } = require("../Keycloak/KeycloakService");

// Field mapping for receptions (similar to treatment)

const receptionFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_id: (val) => val,
  username: (val) => val,
  password: (val) => val,
  full_name: (val) => val,
  email: (val) => val,
  status: (val) => helper.parseBoolean(val),
  profile_picture: (val) => val,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val,
  date_of_birth: (val) => val,
  gender: (val) => val,
  address: (val) => helper.safeStringify(val),
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pincode: (val) => val,
  last_login: (val) => val,
};
const receptionFieldsReverseMap = {
  reception_id: (val) => val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_id: (val) => val,
  username: (val) => val,
  password: (val) => val?String(val):null,
  full_name: (val) => val,
  email: (val) => val,
  status: (val) => Boolean(val),
  profile_picture: (val) => val,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val,
  date_of_birth: (val) => formatDateOnly(val),
  gender: (val) => val,
  address: (val) => helper.safeJsonParse(val),
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pincode: (val) => val,
  last_login: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create Reception
const createReception = async (data, token, realm) => {
  const fieldMap = {
    ...receptionFields,
    created_by: (val) => val,
  };

  let userId = null; // Track Keycloak user for rollback
  let username = null; // Generated username
  let rawPassword = null; // Raw password to return (once)

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (process.env.KEYCLOAK_POWER === "on") {
      // 1. Generate username
      username = await helper.generateUsername("REC", realm, token);
      const newpassword = "1234" || helper.generateAlphanumericPassword();
      rawPassword = helper.encrypt(newpassword);
      const email =
        data.email ||
        `${username}${helper.generateAlphanumericPassword()}@gmail.com`;

      // 2. Extract firstName and lastName from full_name
      const [firstName, ...rest] = data.full_name.trim().split(" ");
      const lastName = rest.length > 0 ? rest.join(" ") : "-";

      const userData = {
        username,
        email,
        firstName,
        lastName,
        password: "1234"||rawPassword,
        emailVerified: true,
      };

      // 3. Create Keycloak user
      const isUserCreated = await addUser(token, realm, userData);
      if (!isUserCreated) {
        throw new CustomError("Keycloak user creation failed", 400);
      }
      console.log("✅ Keycloak user created:", username);

      // 4. Get Keycloak user ID
      userId = await getUserIdByUsername(token, realm, username);
      if (!userId) {
        throw new CustomError("Could not fetch Keycloak user ID", 400);
      }
      console.log("🆔 Keycloak user ID fetched:", userId);

      // 5. Assign 'receptionist' role
      const roleAssigned = await assignRealmRoleToUser(
        token,
        realm,
        userId,
        "receptionist"
      );
      if (!roleAssigned) {
        throw new CustomError("Failed to assign 'receptionist' role", 400);
      }
      console.log("🏷️ Role 'receptionist' assigned");

      // 6. Optional: Add to group (clinic-based)
      if (data.clinic_id) {
        const groupName = `dental-${data.tenant_id}-${data.clinic_id}`;
        const groupAdded = await addUserToGroup(
          token,
          realm,
          userId,
          groupName
        );
        if (!groupAdded) {
          console.warn(`⚠️ Failed to add receptionist to group: ${groupName}`);
        } else {
          console.log(`👥 Added to group: ${groupName}`);
        }
      }

      // Attach to DB data
      data.keycloak_id = userId;
      data.username = username;
      data.password = encrypt(rawPassword).content;
    }

    // 7. Map fields and insert receptionist
    const { columns, values } = mapFields(data, fieldMap);
    const receptionId = await receptionModel.createReception(
      connection,
      "reception",
      columns,
      values
    );

    // 8. Commit transaction
    await connection.commit();

    // 9. Invalidate cache (after success)
    await invalidateCacheByPattern("reception:*");
    await invalidateCacheByPattern("reception:clinic:*"); // Optional: granular

    // 10. Return result
    return {
      receptionId,
      username,
      password: rawPassword, // Only returned once — during creation
    };
  } catch (error) {
    // 🔴 Rollback transaction
    await connection.rollback();

    // 🔁 Rollback Keycloak user if created
    if (process.env.KEYCLOAK_POWER === "on" && userId) {
      try {
        await rollbackKeycloakUser(token, realm, userId);
        console.log(`♻️ Rolled back Keycloak user: ${userId}`);
      } catch (rollbackErr) {
        console.error("❌ Failed to rollback Keycloak user:", rollbackErr);
      }
    }

    console.error("❌ Failed to create reception:", error.message);
    throw new CustomError(`Failed to create reception: ${error.message}`, 500);
  } finally {
    connection.release(); // Always release connection back to pool
  }
};

// Get All Receptions by Tenant ID with Caching
const getAllReceptionsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("reception", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });

  try {
    const receptions = await getOrSetCache(cacheKey, async () => {
      const result = await receptionModel.getAllReceptionsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = receptions.data.map((reception) =>
      helper.convertDbToFrontend(reception, receptionFieldsReverseMap)
    );

    return { data: convertedRows, total: receptions.total };
  } catch (err) {
    console.error("Database error while fetching receptions:", err);
    throw new CustomError("Failed to fetch receptions", 404);
  }
};

// Get Reception by ID & Tenant
const getReceptionByTenantIdAndReceptionId = async (tenantId, receptionId) => {
  try {
    const reception = await receptionModel.getReceptionByTenantAndReceptionId(
      tenantId,
      receptionId
    );

    const convertedRows = helper.convertDbToFrontend(
      reception,
      receptionFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get reception: " + error.message, 404);
  }
};

// Update Reception
const updateReception = async (receptionId, data, tenant_id, token, realm) => {
  const fieldMap = {
    ...receptionFields,
    updated_by: (val) => val,
  };

  let userId = null;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Get current receptionist
    const reception = await receptionModel.getReceptionByTenantAndReceptionId(
      tenant_id,
      receptionId,
      connection
    );

    if (!reception) {
      throw new CustomError("Reception not found", 404);
    }

    userId = reception.keycloak_id;

    // 2. Update DB
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await receptionModel.updateReception(
      connection,
      receptionId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      await connection.commit();
      return { affectedRows };
    }

    // 3. Sync to Keycloak (email, full_name → firstName/lastName)
    if (process.env.KEYCLOAK_POWER === "on" && userId) {
      const updatePayload = {};

      if (data.email) {
        updatePayload.email = data.email;
        updatePayload.emailVerified = true; // 🔑 Required to update email
      }

      if (data.full_name) {
        const [firstName, ...rest] = data.full_name.trim().split(" ");
        updatePayload.firstName = firstName;
        updatePayload.lastName = rest.length > 0 ? rest.join(" ") : "-";
      }

      if (Object.keys(updatePayload).length > 0) {
        try {
          await updateUserInKeycloak(token, realm, userId, updatePayload);
          console.log(
            `✅ Synced receptionist ${receptionId} to Keycloak`,
            updatePayload
          );
        } catch (kcError) {
          console.warn(
            `⚠️ Keycloak sync failed for receptionist ${receptionId}. Continuing with DB update.`,
            kcError.message
          );
          // 🟡 Do NOT rollback DB — Keycloak sync is best-effort
        }
      }
    }

    // 4. Commit transaction
    await connection.commit();

    // 5. Invalidate cache
    await invalidateCacheByPattern("reception:*");

    return { affectedRows };
  } catch (error) {
    await connection.rollback();
    console.error("Update Reception Error:", error.message);
    throw new CustomError(`Failed to update reception: ${error.message}`, 500);
  } finally {
    connection.release();
  }
};

// Delete Reception
const deleteReceptionByTenantIdAndReceptionId = async (
  tenantId,
  receptionId,
  token,
  realm
) => {
  let userId = null;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Get receptionist from DB
    const reception = await receptionModel.getReceptionByTenantAndReceptionId(
      tenantId,
      receptionId,
      connection
    );

    if (!reception) {
      throw new CustomError("Reception not found.", 404);
    }

    userId = reception.keycloak_id;

    // 2. Delete from DB
    const affectedRows =
      await receptionModel.deleteReceptionByTenantAndReceptionId(
        connection,
        tenantId,
        receptionId
      );

    if (affectedRows === 0) {
      throw new CustomError("Failed to delete reception from database.", 500);
    }

    // 3. Delete from Keycloak
    if (process.env.KEYCLOAK_POWER === "on" && userId) {
      try {
        const success = await rollbackKeycloakUser(token, realm, userId);
        if (!success) {
          throw new CustomError("Failed to delete user from Keycloak", 500);
        }
        console.log(`✅ Keycloak user ${userId} deleted (receptionist)`);
      } catch (kcError) {
        console.error(
          `❌ Keycloak deletion failed for receptionist ${userId}:`,
          kcError.message
        );
        // 🔁 Rollback DB delete
        await connection.rollback();
        throw new CustomError(
          "Failed to delete receptionist in Keycloak. Aborting delete.",
          500
        );
      }
    }

    // 4. Commit only if all succeeded
    await connection.commit();

    // 5. Invalidate cache
    await invalidateCacheByPattern("reception:*");

    return { affectedRows };
  } catch (error) {
    console.error("Delete Reception Error:", error.message);
    throw new CustomError(`Failed to delete reception: ${error.message}`, 400);
  } finally {
    connection.release();
  }
};

const getAllReceptionsByTenantIdAndClinicId = async (
  tenantId,
  clinic_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("reception", "list", {
    tenant_id: tenantId,
    clinic_id,
    page,
    limit,
  });

  try {
    const receptions = await getOrSetCache(cacheKey, async () => {
      const result = await receptionModel.getAllReceptionsByTenantIdAndClinicId(
        tenantId,
        clinic_id,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = receptions.data.map((reception) =>
      helper.convertDbToFrontend(reception, receptionFieldsReverseMap)
    );

    return { data: convertedRows, total: receptions.total };
  } catch (err) {
    console.error("Database error while fetching receptions:", err);
    throw new CustomError("Failed to fetch receptions", 404);
  }
};

module.exports = {
  createReception,
  getAllReceptionsByTenantId,
  getReceptionByTenantIdAndReceptionId,
  updateReception,
  deleteReceptionByTenantIdAndReceptionId,
  getAllReceptionsByTenantIdAndClinicId,
};
