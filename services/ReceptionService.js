const { CustomError } = require("../middlewares/CustomeError");
const receptionModel = require("../models/ReceptionModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const { formatDateOnly } = require("../utils/DateUtils");
const { encrypt } = require("../middlewares/PasswordHash");

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
  profile_picture:(val)=>val,
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
  reception_id:(val)=>val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_id: (val) => val,
  username: (val) => val,
  password: (val) => val,
  full_name: (val) => val,
  email: (val) => val,
  status: (val) => Boolean(val),
  profile_picture:(val)=>val,
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
  created_time: (val) => (val ? new Date(val).toISOString() : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? new Date(val).toISOString() : null),
};
// Create Reception
const createReception = async (data,token,realm) => {
  const fieldMap = {
    ...receptionFields,
    created_by: (val) => val,
  };
  try {
  // 1. Generate username/email
  const username = helper.generateUsername(
    data.first_name,
    data.phone_number
  );
  const email =
    data.email ||
    `${username}${helper.generateAlphanumericPassword()}@gmail.com`;

  const userData = {
    username,
    email,
    firstName: data.first_name,
    lastName: data.last_name,
    password: "1234", // For demo; use generateAlphanumericPassword() in production
  };

  // 2. Create Keycloak User
  const isUserCreated = await addUser(token, realm, userData);
  if (!isUserCreated) throw new CustomError("Keycloak user not created", 400);

  console.log("✅ Keycloak user created:", userData.username);

  // 3. Get User ID from Keycloak
  const userId = await getUserIdByUsername(token, realm, userData.username);
  if (!userId) throw new CustomError("Could not fetch Keycloak user ID", 400);

  console.log("🆔 Keycloak user ID fetched:", userId);

  // 4. Assign Role: 'receptionist'
  const roleAssigned = await assignRealmRoleToUser(
    token,
    realm,
    userId,
    "receptionist"
  );
  if (!roleAssigned)
    throw new CustomError("Failed to assign 'receptionist' role", 400);

  console.log("🩺 Assigned 'receptionist' role");

  // 5. Optional: Add to Group (e.g., based on clinicId)
  if (data.clinicId) {
    const groupName = `dental-${data.tenantId}-${data.clinicId}`;
    const groupAdded = await addUserToGroup(token, realm, userId, groupName);

    if (!groupAdded) {
      console.warn(`⚠️ Failed to add user to group: ${groupName}`);
    } else {
      console.log(`👥 Added to group: ${groupName}`);
    }
  }

  data.keycloak_id=userId,
  data.username=username,
  data.password=encrypt(userData.password).content

    const { columns, values } = mapFields(data, fieldMap);
    const receptionId = await receptionModel.createReception(
      "reception",
      columns,
      values
    );
    await invalidateCacheByPattern("reception:*");
    return receptionId;
  } catch (error) {
    console.error("Failed to create reception:", error);
    throw new CustomError(`Failed to create reception: ${error.message}`, 404);
  }
};

// Get All Receptions by Tenant ID with Caching
const getAllReceptionsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `reception:${tenantId}:page:${page}:limit:${limit}`;

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
const getReceptionByTenantIdAndReceptionId = async (
  tenantId,
  receptionId
) => {
  try {
    const reception =
      await receptionModel.getReceptionByTenantAndReceptionId(
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
const updateReception = async (receptionId, data, tenant_id) => {
  const fieldMap = {
    ...receptionFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await receptionModel.updateReception(
      receptionId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Reception not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("reception:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update reception", 404);
  }
};

// Delete Reception
const deleteReceptionByTenantIdAndReceptionId = async (
  tenantId,
  receptionId
) => {
  try {
    const affectedRows =
      await receptionModel.deleteReceptionByTenantAndReceptionId(
        tenantId,
        receptionId
      );
    if (affectedRows === 0) {
      throw new CustomError("Reception not found.", 404);
    }

    await invalidateCacheByPattern("reception:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete reception: ${error.message}`, 404);
  }
};

module.exports = {
  createReception,
  getAllReceptionsByTenantId,
  getReceptionByTenantIdAndReceptionId,
  updateReception,
  deleteReceptionByTenantIdAndReceptionId,
};
