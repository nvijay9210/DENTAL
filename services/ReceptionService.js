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
const { createEntity, updateEntity } = require("../utils/Reusability");

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
  password: (val) => (val ? String(val) : null),
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
  const newReception = await createEntity({
    data,
    entityName: "reception",
    token,
    realm,
    fieldMap: receptionFields,
    createModel: receptionModel.createReception,
    nameFields: { fullName: "full_name" },
    roleName: "receptionist",
  });

  return newReception;
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
  return await updateEntity({
    entityId: receptionId,
    entityName: "reception",
    tenantId:tenant_id,
    data,
    token,
    realm,
    fieldMap: receptionFields,
    getModelById: receptionModel.getReceptionByTenantAndReceptionId,
    updateModel: receptionModel.updateReception,
    fileFields: ["profile_picture"],
  });
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
