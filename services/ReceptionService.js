const { CustomError } = require("../middlewares/CustomeError");
const receptionModel = require("../models/ReceptionModel");
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
} = require("../middlewares/KeycloakAdmin");
const { buildCacheKey } = require("../utils/RedisCache");
const { deleteDocumentsByTableAndId, getDocumentsByField } = require("../models/documentModel");
const { saveDocuments, updateSingleDocument2 } = require("../utils/UploadFiles");
const { convertRowsWithDocs } = require("../utils/ResponseConvertion");

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
  password: (val) => val,
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
  try {

    if (process.env.KEYCLOAK_POWER === "on") {
      // 1. Generate username/email
      const username = helper.generateUsername(
        data.full_name,
        data.phone_number
      );
      const email =
        data.email ||
        `${username}${helper.generateAlphanumericPassword()}@gmail.com`;

      const [firstName, ...rest] = data.full_name.trim().split(" ");
      const lastName = rest.length > 0 ? rest.join(" ") : "-";

      const userData = {
        username,
        email,
        firstName,
        lastName,
        password: "1234", // For demo; use generateAlphanumericPassword() in production
      };

      // 2. Create Keycloak User
      const isUserCreated = await addUser(token, realm, userData);
      if (!isUserCreated)
        throw new CustomError("Keycloak user not created", 400);

      console.log("✅ Keycloak user created:", userData.username);

      // 3. Get User ID from Keycloak
      const userId = await getUserIdByUsername(token, realm, userData.username);
      if (!userId)
        throw new CustomError("Could not fetch Keycloak user ID", 400);

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
      if (data.clinic_id) {
        const groupName = `dental-${data.tenant_id}-${data.clinic_id}`;
        const groupAdded = await addUserToGroup(
          token,
          realm,
          userId,
          groupName
        );

        if (!groupAdded) {
          console.warn(`⚠️ Failed to add user to group: ${groupName}`);
        } else {
          console.log(`👥 Added to group: ${groupName}`);
        }
      }

      (data.keycloak_id = userId),
        (data.username = username),
        (data.password = encrypt(userData.password).content);
    }

    const { columns, values } = mapFields(data, fieldMap);
    const receptionId = await receptionModel.createReception(
      "reception",
      columns,
      values
    );

    if (data?.profile_picture) {
      await saveDocuments({
        table_name: "reception",
        table_id: receptionId,
        field_name: "profile_picture",
        files: data?.profile_picture, // from middleware
        created_by: data.created_by,
      });
    }
    await invalidateCacheByPattern("reception:*");


    return receptionId;
  } catch (error) {
    console.error("Failed to create reception:", error);
    throw new CustomError(err, 500);
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

    const convertedRows = await convertRowsWithDocs({
      rows: receptions.data,
      convertFn: helper.convertDbToFrontend,
      convertArgs: [receptionFieldsReverseMap],
      docOptions: [
        {
          tableName: "reception",
          idField: "reception_id",
          docFieldName: "profile_picture",
          extractFields: ["document_id", "file_url"]
        }
      ]
    });

    return { data: convertedRows, total: receptions.total };

  } catch (err) {
    console.error("Database error while fetching receptions:", err);
    throw new CustomError(err, 500);
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

    const documents = await getDocumentsByField(
      "reception",
      receptionId,
      "profile_picture"
    );

    // Format each document
    const profile_picture = documents.map((doc) => ({
      document_id: doc.document_id,
      file_url: doc.file_url,
    }));

    // Attach to the response
    return {
      ...convertedRows,
      profile_picture,
    };
  } catch (error) {
    throw new CustomError(err, 500);
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

    await updateSingleDocument2({
      table_name: "reception",
      table_id: receptionId,
      field_name: "profile_picture",
      newFile: data?.profile_picture,
      deleteOld: true,
      created_by: data.created_by,
      updated_by: data.updated_by
    });

    await invalidateCacheByPattern("reception:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError(err, 500);
  }
};

// Delete Reception
const deleteReceptionByTenantIdAndReceptionId = async (
  tenantId,
  receptionId
) => {
  try {
    await deleteDocumentsByTableAndId('reception',receptionId)
    const affectedRows =
      await receptionModel.deleteReceptionByTenantAndReceptionId(
        tenantId,
        receptionId
      );
    // if (affectedRows === 0) {
    //   throw new CustomError("Reception not found.", 404);
    // }

    await invalidateCacheByPattern("reception:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(err, 500);
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

    const convertedRows = await convertRowsWithDocs({
      rows: receptions.data,
      convertFn: helper.convertDbToFrontend,
      convertArgs: [receptionFieldsReverseMap],
      docOptions: [
        {
          tableName: "reception",
          idField: "reception_id",
          docFieldName: "profile_picture",
          extractFields: ["document_id", "file_url"]
        }
      ]
    });

    return { data: convertedRows, total: receptions.total };
  } catch (err) {
    console.error("Database error while fetching receptions:", err);
    throw new CustomError(err, 500);
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
