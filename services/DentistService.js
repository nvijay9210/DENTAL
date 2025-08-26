const { CustomError } = require("../middlewares/CustomeError");
const dentistModel = require("../models/DentistModel"); // Make sure this model exists
const pool = require("../config/db");
const fs = require("fs");
const path = require("path");
const {
  redisClient,
  invalidateCacheByPattern,
  getOrSetCache,
} = require("../config/redisConfig");
const {
  addUser,
  getUserIdByUsername,
  assignRealmRoleToUser,
  addUserToGroup,
  updateUserInKeycloak,
} = require("../middlewares/KeycloakAdmin");
const { mapFields } = require("../query/Records");
const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");

const helper = require("../utils/Helpers");

const { encrypt } = require("../middlewares/PasswordHash");
const { buildCacheKey } = require("../utils/RedisCache");
const {
  deleteUploadedFiles,
  deleteFileIfExists,
  saveDocuments,
  updateDocumentsDiffBased,
  updateSingleDocument2,
} = require("../utils/UploadFiles");
const {
  getDocumentsByField,
  deleteDocumentsByTableAndId,
} = require("../models/documentModel");
const { rollbackKeycloakUser } = require("../Keycloak/KeycloakService");

const dentistFieldMap = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_id: (val) => val,
  username: (val) => val,
  password: (val) => val,
  first_name: (val) => val,
  last_name: (val) => val,
  gender: (val) => val,
  date_of_birth: formatDateOnly,
  email: (val) => val,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val,

  specialisation: (val) => val,
  designation:(val) => val,
  languages_spoken: helper.safeStringify,
  working_hours: helper.safeStringify,
  available_days: helper.safeStringify,
  bio: helper.safeStringify,
  social_links: helper.safeStringify,
  social_activities: helper.safeStringify,
  internship: helper.safeStringify,
  position_held: helper.safeStringify,
  research_projects: helper.safeStringify,
  publication: helper.safeStringify,
  member_of: helper.safeStringify,

  experience_years: (val) => (val ? parseInt(val) : 0),
  license_number: (val) => val,
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pin_code: (val) => val,
  profile_picture: (val) => val,

  consultation_fee: (val) => (val ? parseFloat(val) : 0),
  currency_code: (val) => val,
  min_booking_fee: (val) => (val ? parseFloat(val) : 0),
  ratings: (val) => (val ? parseFloat(val) : 0),
  reviews_count: (val) => (val ? parseInt(val) : 0),
  appointment_count: (val) => (val ? parseInt(val) : 0),

  teleconsultation_supported: helper.parseBoolean,

  last_login: (val) => val,
  duration: (val) => val,
};

const dentistFieldReverseMap = {
  dentist_id: (val) => val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  keycloak_id: (val) => val,
  username: (val) => val,
  password: (val) => val?String(val):null,
  first_name: (val) => val,
  last_name: (val) => val,
  gender: (val) => val,
  date_of_birth: (val) => (val ? formatDateOnly(val) : null),
  email: (val) => val,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val,
  specialisation: (val) => val,

  designation:(val) => val,
  languages_spoken: (val) => helper.safeJsonParse(val),
  working_hours: (val) => helper.safeJsonParse(val),
  available_days: (val) => helper.safeJsonParse(val),
  bio: (val) => helper.safeJsonParse(val),
  social_links: (val) => helper.safeJsonParse(val),
  social_activities: (val) => helper.safeJsonParse(val),
  internship: (val) => helper.safeJsonParse(val),
  position_held: (val) => helper.safeJsonParse(val),
  research_projects: (val) => helper.safeJsonParse(val),
  publication: (val) => helper.safeJsonParse(val),
  member_of: (val) => helper.safeJsonParse(val),
  profile_picture: (val) => val,

  experience_years: (val) => (val ? parseInt(val) : 0),
  license_number: (val) => val,
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pin_code: (val) => val,

  consultation_fee: (val) => (val ? parseFloat(val) : 0),
  currency_code: (val) => val,
  min_booking_fee: (val) => (val ? parseFloat(val) : 0),
  ratings: (val) => (val ? parseFloat(val) : 0),
  reviews_count: (val) => (val ? parseInt(val) : 0),
  appointment_count: (val) => (val ? parseInt(val) : 0),

  teleconsultation_supported: (val) => Boolean(val),

  last_login: (val) => val,
  duration: (val) => val,
  status: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};

// -------------------- CREATE --------------------

const createDentist = async (data, token, realm) => {
  const create = {
    ...dentistFieldMap,
    created_by: (val) => val,
  };

  let userId = null;       // Track Keycloak user for rollback
  let username = null;     // Generated username
  let rawPassword = null;  // Raw password to return

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    if (process.env.KEYCLOAK_POWER === "on") {
      // 1. Generate username and password
      username = await helper.generateUsername("DEN", realm, token);
      const newpassword ="1234" || helper.generateAlphanumericPassword();
            rawPassword= helper.encrypt(newpassword)
      const email =
        data.email ||
        `${username}${helper.generateAlphanumericPassword()}@gmail.com`;

      const userData = {
        username,
        email,
        emailVerified: true,
        firstName: data.first_name,
        lastName: data.last_name,
        password: "1234"||rawPassword,
      };

      // 2. Create Keycloak user
      const isUserCreated = await addUser(token, realm, userData);
      if (!isUserCreated) {
        throw new CustomError("Keycloak user creation failed", 400);
      }
      console.log("✅ Keycloak user created:", username);

      // 3. Get Keycloak user ID
      userId = await getUserIdByUsername(token, realm, username);
      if (!userId) {
        throw new CustomError("Could not fetch Keycloak user ID", 400);
      }
      console.log("🆔 Keycloak user ID fetched:", userId);

      // 4. Assign 'dentist' role
      const roleAssigned = await assignRealmRoleToUser(
        token,
        realm,
        userId,
        "dentist"
      );
      if (!roleAssigned) {
        throw new CustomError("Failed to assign 'dentist' role", 400);
      }
      console.log("🩺 Role 'dentist' assigned");

      // 5. Optional: Add to group (clinic-based)
      if (data.clinic_id) {
        const groupName = `dental-${data.tenant_id}-${data.clinic_id}`;
        const groupAdded = await addUserToGroup(token, realm, userId, groupName);
        if (!groupAdded) {
          console.warn(`⚠️ Failed to add dentist to group: ${groupName}`);
        } else {
          console.log(`👥 Added to group: ${groupName}`);
        }
      }

      // Attach to data for DB
      data.keycloak_id = userId;
      data.username = username;
      data.password = encrypt(rawPassword).content;
    }

    // 6. Insert dentist into DB
    const { columns, values } = mapFields(data, create);
    const dentistId = await dentistModel.createDentist(
      connection,
      "dentist",
      columns,
      values
    );

    // 7. Save documents (awards, certifications) with descriptions
    if (data.awards_certifications && data.awards_certifications.length > 0) {
      await saveDocuments({
        table_name: "dentist",
        table_id: dentistId,
        field_name: "awards_certifications",
        files: data.awards_certifications,
        created_by: data.created_by,
        descriptions: data.descriptions, // Pass descriptions if any
      });
    }

    // 8. Commit transaction
    await connection.commit();

    // 9. Invalidate cache (only after commit)
    await invalidateCacheByPattern("dentist:*");
    await invalidateCacheByPattern("dentist:clinic:*"); // Optional: more granular

    // 10. Return result
    return {
      dentistId,
      username,
      password: rawPassword, // Return raw password only on create
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

    console.error("❌ Failed to create dentist:", error.message);
    throw new CustomError(`Failed to create dentist: ${error.message}`, 500);
  } finally {
    connection.release(); // Always release
  }
};

// -------------------- UPDATE --------------------
const updateDentist = async (dentistId, data, tenant_id, token, realm) => {
  const update = {
    ...dentistFieldMap,
    updated_by: (val) => val,
  };

  let userId = null;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Get current dentist (to get keycloak_id)
    const dentist = await dentistModel.getDentistByTenantIdAndDentistId(
      tenant_id,
      dentistId,
      connection
    );

    if (!dentist) {
      throw new CustomError("Dentist not found", 404);
    }

    userId = dentist.keycloak_id;

    // 2. Update DB
    const { columns, values } = mapFields(data, update);
    const affectedRows = await dentistModel.updateDentist(
      connection,
      dentistId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      await connection.commit();
      return { affectedRows };
    }

    // 3. Sync to Keycloak (email, name)
    if (process.env.KEYCLOAK_POWER === "on" && userId) {
      const updatePayload = {};
      if (data.email) updatePayload.email = data.email;
      if (data.first_name) updatePayload.firstName = data.first_name;
      if (data.last_name) updatePayload.lastName = data.last_name;

      if (Object.keys(updatePayload).length > 0) {
        try {
          await updateUserInKeycloak(token, realm, userId, updatePayload);
          console.log(`✅ Synced dentist ${dentistId} to Keycloak`, updatePayload);
        } catch (kcError) {
          console.warn(
            `⚠️ Keycloak sync failed for dentist ${dentistId}. Continuing with DB update.`,
            kcError.message
          );
          // 🟡 Do NOT rollback — DB is source of truth
        }
      }
    }

    // 4. Handle file updates (awards_certifications)
    const awards_certifications = data.awards_certifications || [];
    if (awards_certifications.length > 0 || data.deletedFileIds?.length > 0) {
      await updateDocumentsDiffBased({
        table_name: "dentist",
        table_id: dentistId,
        field_name: "awards_certifications",
        newFiles: awards_certifications,
        deletedFileIds: data.deletedFileIds || [],
        created_by: data.created_by,
        updated_by: data.updated_by,
        descriptions: data.descriptions,
      });
    }

    // 5. Commit transaction
    await connection.commit();

    // 6. Invalidate cache
    await invalidateCacheByPattern("dentist:*");
    await invalidateCacheByPattern("dentist:clinic:*");

    return { affectedRows };
  } catch (error) {
    await connection.rollback();
    console.error("Update Dentist Error:", error.message);
    throw new CustomError(`Failed to update dentist: ${error.message}`, 500);
  } finally {
    connection.release();
  }
};

// -------------------- GET ALL --------------------
const getAllDentistsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("dentist", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });

  try {
    const dentists = await getOrSetCache(cacheKey, async () => {
      return await dentistModel.getAllDentistsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
    });

    const convertedRows = await Promise.all(
      dentists.data.map(async (dentist) => {
        const formatted = helper.convertDbToFrontend(
          dentist,
          dentistFieldReverseMap
        );

        const awards = await getDocumentsByField(
          "dentist",
          dentist.dentist_id,
          "awards_certifications"
        );
        const awards_certifications = awards.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
          description:doc.description
        }));

        return {
          ...formatted,
          awards_certifications,
        };
      })
    );

    return { data: convertedRows, total: dentists.total };
  } catch (error) {
    console.error("Database error while fetching dentists:", error.message);
    throw new CustomError(error, 500);
  }
};

// function flattenAwards(dentist) {
//   const flattened = {};

//   if (Array.isArray(dentist.awards_certifications)) {
//     dentist.awards_certifications.forEach((cert, index) => {
//       flattened[`awards_certifications_${index}`] = cert.image || "";
//       flattened[`description_awards_certifications_${index}`] =
//         cert.description || "";
//     });
//   }

//   // Remove original field if not needed
//   delete dentist.awards_certifications;

//   return {
//     ...dentist,
//     ...flattened,
//   };
// }

// -------------------- GET SINGLE --------------------

const getDentistByTenantIdAndDentistId = async (tenantId, dentistId,conn) => {
  try {
    const dentist = await dentistModel.getDentistByTenantIdAndDentistId(
      tenantId,
      dentistId,conn
    );

    if (!dentist) {
      throw new CustomError("Dentist not found", 404);
    }

    const formatted = helper.convertDbToFrontend(
      dentist,
      dentistFieldReverseMap
    );

    const awards = await getDocumentsByField(
      "dentist",
      dentistId,
      "awards_certifications"
    );
    const awards_certifications = awards.map((doc) => ({
      document_id: doc.document_id,
      file_url: doc.file_url,
      description:doc.descriptions
    }));

    return {
      ...formatted,
      awards_certifications,
    };
  } catch (error) {
    throw new CustomError(error, 500);
  }
};

// -------------------- DELETE --------------------
const deleteDentistByTenantIdAndDentistId = async (
  tenantId,
  dentistId,
  token,
  realm
) => {
  let userId = null;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Get dentist from DB (to get keycloak_id)
    const dentist = await dentistModel.getDentistByTenantIdAndDentistId(
      tenantId,
      dentistId,
      connection
    );

    if (!dentist) {
      throw new CustomError("Dentist not found.", 404);
    }

    userId = dentist.keycloak_id;

    // 2. Delete documents (files metadata)
    await deleteDocumentsByTableAndId(connection, "dentist", dentistId);

    // 3. Delete from DB
    const affectedRows = await dentistModel.deleteDentistByTenantIdAndDentistId(
      connection,
      tenantId,
      dentistId
    );

    if (affectedRows === 0) {
      throw new CustomError("Failed to delete dentist from database.", 500);
    }

    // 4. Delete from Keycloak (if enabled)
    if (process.env.KEYCLOAK_POWER === "on" && userId) {
      try {
        const success = await rollbackKeycloakUser(token, realm, userId);
        if (!success) {
          throw new CustomError("Failed to delete user from Keycloak", 500);
        }
        console.log(`✅ Keycloak user ${userId} deleted (dentist)`);
      } catch (kcError) {
        console.error(`❌ Keycloak deletion failed for dentist ${userId}:`, kcError.message);
        // 🔁 Rollback DB
        await connection.rollback();
        throw new CustomError(
          "Failed to delete dentist in Keycloak. Aborting delete.",
          500
        );
      }
    }

    // 5. Commit only if all steps succeeded
    await connection.commit();

    // 6. Invalidate cache
    await invalidateCacheByPattern("dentist:*");

    return { affectedRows };
  } catch (error) {
    console.error("Delete Dentist Error:", error.message);
    throw new CustomError(`Failed to delete dentist: ${error.message}`, 400);
  } finally {
    connection.release();
  }
};

// -------------------- CHECK EXISTS --------------------
const checkDentistExistsByTenantIdAndDentistId = async (
  tenantId,
  dentistId
) => {
  try {
    return await dentistModel.checkDentistExistsByTenantIdAndDentistId(
      tenantId,
      dentistId
    );
  } catch (error) {
    throw new CustomError(
      `Failed to check dentist existence: ${error.message}`,
      404
    );
  }
};

const getAllDentistsByTenantIdAndClinicId = async (
  tenantId,
  clinicId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("dentist", "list", {
    tenant_id: tenantId,
    clinic_id: clinicId,
    page,
    limit,
  });

  try {
    const dentists = await getOrSetCache(cacheKey, async () => {
      return await dentistModel.getAllDentistsByTenantIdAndClinicId(
        tenantId,
        clinicId,
        Number(limit),
        offset
      );
    });

    const convertedRows = await Promise.all(
      dentists.data.map(async (dentist) => {
        const formatted = helper.convertDbToFrontend(
          dentist,
          dentistFieldReverseMap
        );

        const awards = await getDocumentsByField(
          "dentist",
          dentist.dentist_id,
          "awards_certifications"
        );
        const awards_certifications = awards.map((doc) => ({
          document_id: doc.document_id,
          awards_certifications: doc.file_url,
          description:doc.description
        }));

        return {
          ...formatted,
          awards_certifications,
        };
      })
    );

    return { data: convertedRows, total: dentists.total };
  } catch (error) {
    console.log(error);
    throw new CustomError(error, 500);
  }
};

const updateClinicIdAndNameAndAddress = async (
  tenantId,
  clinicId,
  clinic_name,
  clinic_addrss,
  dentistId
) => {
  try {
    const result = await dentistModel.updateClinicIdAndNameAndAddress(
      tenantId,
      clinicId,
      clinic_name,
      clinic_addrss,
      dentistId
    );
    await invalidateCacheByPattern("dentist:*");
    return result;
  } catch (error) {
    throw new CustomError(error, 500);
  }
};

const updateNullClinicInfoWithJoin = async (tenantId, clinicId, dentistId) => {
  try {
    const result = await dentistModel.updateNullClinicInfoWithJoin(
      tenantId,
      clinicId,
      dentistId
    );
    await invalidateCacheByPattern("dentist:*");
    return result;
  } catch (error) {
    throw new CustomError(error, 500);
  }
};

module.exports = {
  createDentist,
  updateDentist,
  getAllDentistsByTenantId,
  getDentistByTenantIdAndDentistId,
  checkDentistExistsByTenantIdAndDentistId,
  deleteDentistByTenantIdAndDentistId,
  getAllDentistsByTenantIdAndClinicId,
  updateClinicIdAndNameAndAddress,
  updateNullClinicInfoWithJoin,
};
