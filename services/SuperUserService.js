const { CustomError } = require("../middlewares/CustomeError");
const superuserModel = require("../models/SuperUserModel");
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
} = require("../Keycloak/KeycloakAdmin");
const { buildCacheKey } = require("../utils/RedisCache");
const { rollbackKeycloakUser } = require("../Keycloak/KeycloakService");
const { createEntity, updateEntity } = require("../utils/Reusability");

// Field mapping for superusers (similar to treatment)

const superuserFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_id: (val) => val,
  superuser_code: (val) => val,
  username: (val) => val,
  password: (val) => val,
  first_name: (val) => val,
  last_name: (val) => val,
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
const superuserFieldsReverseMap = {
  superuser_id: (val) => val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_id: (val) => val,
  superuser_code: (val) => val,
  username: (val) => val,
  password: (val) => (val ? String(val) : null),
  first_name: (val) => val,
  last_name: (val) => val,
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
// Create SuperUser
const createSuperUser = async (data, token, realm) => {
  const newSuperUser = await createEntity({
    data,
    entityName: "superuser",
    token,
    realm,
    fieldMap: superuserFields,
    createModel: superuserModel.createSuperUser,
    nameFields: { firstName: "first_name", lastName: "last_name" },
    roleName: "superuser",
  });

  return newSuperUser;
};

// Get All SuperUsers by Tenant ID with Caching
const getAllSuperUsersByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("superuser", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });

  try {
    const superusers = await getOrSetCache(cacheKey, async () => {
      const result = await superuserModel.getAllSuperUsersByTenantId(
        tenantId,
        Number(limit),
        offset,
      );
      return result;
    });

    const convertedRows = superusers.data.map((superuser) =>
      helper.convertDbToFrontend(superuser, superuserFieldsReverseMap),
    );

    return { data: convertedRows, total: superusers.total };
  } catch (err) {
    console.error("Database error while fetching superusers:", err);
    throw new CustomError("Failed to fetch superusers", 404);
  }
};

// Get SuperUser by ID & Tenant
const getSuperUserByTenantIdAndSuperUserId = async (tenantId, superuserId) => {
  try {
    const superuser = await superuserModel.getSuperUserByTenantAndSuperUserId(
      tenantId,
      superuserId,
    );

    const convertedRows = helper.convertDbToFrontend(
      superuser,
      superuserFieldsReverseMap,
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get superuser: " + error.message, 404);
  }
};

// Update SuperUser
const updateSuperUser = async (superuserId, data, tenant_id, token, realm) => {
  // console.log(superuserId, data, tenant_id, token, realm)
  try {
    return await updateEntity({
      entityId: superuserId,
      entityName: "superuser",
      tenantId: tenant_id,
      data,
      token,
      realm,
      fieldMap: superuserFields,
      getModelById: superuserModel.getSuperUserByTenantAndSuperUserId,
      updateModel: superuserModel.updateSuperUser,
      fileFields: ["profile_picture"],
    });
  } catch (error) {
    console.error("Update SuperUser Error:", error.message);
    throw new CustomError(`Failed to update superuser: ${error.message}`, 400);
  }
};

/**
 * Update Superuser Service
 */

// Delete SuperUser
const deleteSuperUserByTenantIdAndSuperUserId = async (
  tenantId,
  superuserId,
  token,
  realm,
) => {
  let userId = null;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Get superuser from DB
    const superuser = await superuserModel.getSuperUserByTenantAndSuperUserId(
      tenantId,
      superuserId,
      connection,
    );

    if (!superuser) {
      throw new CustomError("SuperUser not found.", 404);
    }

    userId = superuser.keycloak_id;

    // 2. Delete from DB
    const affectedRows =
      await superuserModel.deleteSuperUserByTenantAndSuperUserId(
        connection,
        tenantId,
        superuserId,
      );

    if (affectedRows === 0) {
      throw new CustomError("Failed to delete superuser from database.", 500);
    }

    // 3. Delete from Keycloak
    if (process.env.KEYCLOAK_POWER === "on" && userId) {
      try {
        const success = await rollbackKeycloakUser(token, realm, userId);
        if (!success) {
          throw new CustomError("Failed to delete user from Keycloak", 500);
        }
        console.log(`✅ Keycloak user ${userId} deleted (superuser)`);
      } catch (kcError) {
        console.error(
          `❌ Keycloak deletion failed for superuser ${userId}:`,
          kcError.message,
        );
        // 🔁 Rollback DB delete
        await connection.rollback();
        throw new CustomError(
          "Failed to delete superuser in Keycloak. Aborting delete.",
          500,
        );
      }
    }

    // 4. Commit only if all succeeded
    await connection.commit();

    // 5. Invalidate cache
    await invalidateCacheByPattern("superuser:*");

    return { affectedRows };
  } catch (error) {
    console.error("Delete SuperUser Error:", error.message);
    throw new CustomError(`Failed to delete superuser: ${error.message}`, 400);
  } finally {
    connection.release();
  }
};

const getAllSuperUsersByTenantIdAndClinicId = async (
  tenantId,
  clinic_id,
  page = 1,
  limit = 10,
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("superuser", "list", {
    tenant_id: tenantId,
    clinic_id,
    page,
    limit,
  });

  try {
    const superusers = await getOrSetCache(cacheKey, async () => {
      const result = await superuserModel.getAllSuperUsersByTenantIdAndClinicId(
        tenantId,
        clinic_id,
        Number(limit),
        offset,
      );
      return result;
    });

    const convertedRows = superusers.data.map((superuser) =>
      helper.convertDbToFrontend(superuser, superuserFieldsReverseMap),
    );

    return { data: convertedRows, total: superusers.total };
  } catch (err) {
    console.error("Database error while fetching superusers:", err);
    throw new CustomError("Failed to fetch superusers", 404);
  }
};

module.exports = {
  createSuperUser,
  getAllSuperUsersByTenantId,
  getSuperUserByTenantIdAndSuperUserId,
  updateSuperUser,
  deleteSuperUserByTenantIdAndSuperUserId,
  getAllSuperUsersByTenantIdAndClinicId,
};
