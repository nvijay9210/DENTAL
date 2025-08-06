const { CustomError } = require("../middlewares/CustomeError");
const dentistModel = require("../models/DentistModel"); // Make sure this model exists
const fs = require("fs");
const path = require("path");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const {
  addUser,
  getUserIdByUsername,
  assignRealmRoleToUser,
  addUserToGroup,
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
} = require("../utils/UploadFiles");
const { getDocumentsByField } = require("../models/documentModel");

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
  designation: (val) => helper.safeStringify(val),
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
  awards_certifications: helper.safeStringify,
  member_of: helper.safeStringify,

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

  profile_picture: (val) => val || null,

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
  password: (val) => val,
  first_name: (val) => val,
  last_name: (val) => val,
  gender: (val) => val,
  date_of_birth: (val) => (val ? formatDateOnly(val) : null),
  email: (val) => val,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val,
  specialisation: (val) => val,

  designation: (val) => helper.safeJsonParse(val),
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
  awards_certifications: (val) => helper.safeJsonParse(val),
  member_of: (val) => helper.safeJsonParse(val),

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

  profile_picture: (val) => val,
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

  try {
    let userData;
    if (process.env.KEYCLOAK_POWER === "on") {
      // 1. Generate username/email
      const username = helper.generateUsername(
        data.first_name,
        data.phone_number
      );
      const email =
        data.email ||
        `${username}${helper.generateAlphanumericPassword()}@gmail.com`;

      userData = {
        username,
        email,
        emailVerified: true,
        firstName: data.first_name,
        lastName: data.last_name,
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

      // 4. Assign Role: 'doctor'
      const roleAssigned = await assignRealmRoleToUser(
        token,
        realm,
        userId,
        "dentist"
      );
      if (!roleAssigned)
        throw new CustomError("Failed to assign 'doctor' role", 400);

      console.log("🩺 Assigned 'doctor' role");

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

    // 6. Map fields for DB
    const { columns, values } = mapFields(data, create);

    // 7. Save to DB
    const dentistId = await dentistModel.createDentist(
      "dentist",
      columns,
      values
    );

    await saveDocuments({
      table_name: "dentist",
      table_id: dentistId,
      field_name: "profile_picture",
      files: data.profile_picture,
      created_by: data.created_by,
    });

    await saveDocuments({
      table_name: "dentist",
      table_id: dentistId,
      field_name: "awards_certifications",
      files: data.awards_certifications,
      created_by: data.created_by,
    });

    // 8. Invalidate cache
    await invalidateCacheByPattern("dentist:*");

    // return dentistId;

    return {
      dentistId,
      username: userData.username,
      password: userData.password,
    };
  } catch (error) {
    console.error("❌ Failed to create dentist:", error.message);
    throw new CustomError(error, 500);
  }
};

// -------------------- UPDATE --------------------
const updateDentist = async (dentistId, data, tenant_id) => {
  const update = {
    ...dentistFieldMap,
    updated_by: (val) => val,
  };

  try {
    const dentist = await dentistModel.getDentistByTenantIdAndDentistId(
      tenant_id,
      dentistId
    );

    const { columns, values } = mapFields(data, update);
    const affectedRows = await dentistModel.updateDentist(
      dentistId,
      columns,
      values,
      tenant_id
    );

    // 🔁 Diff-based profile picture update
    await updateDocumentsDiffBased({
      table_name: "dentist",
      table_id: dentistId,
      field_name: "profile_picture",
      newFiles: Array.isArray(data.profile_picture)
        ? data.profile_picture
        : [data.profile_picture],
      updated_by: data.updated_by,
    });

    // 🔁 Diff-based awards_certifications update
    await updateDocumentsDiffBased({
      table_name: "dentist",
      table_id: dentistId,
      field_name: "awards_certifications",
      newFiles: data.awards_certifications || [],
      updated_by: data.updated_by,
    });

    await invalidateCacheByPattern("dentist:*");
    return affectedRows;
  } catch (error) {
    console.error("Failed to update dentist:", error.message);
    throw new CustomError(error, 500);
  }
};
3;
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

        // 📎 Get profile_picture documents
        const profilePics = await getDocumentsByField(
          "dentist",
          dentist.dentist_id,
          "profile_picture"
        );
        const profile_picture = profilePics.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        // 🏆 Get awards_certifications documents
        const awards = await getDocumentsByField(
          "dentist",
          dentist.dentist_id,
          "awards_certifications"
        );
        const awards_certifications = awards.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          profile_picture,
          awards_certifications,
        };
      })
    );

    return { data: convertedRows, total: dentists.total };
  } catch (error) {
    console.error("Database error while fetching dentists:", err.message);
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

const getDentistByTenantIdAndDentistId = async (tenantId, dentistId) => {
  try {
    const dentist = await dentistModel.getDentistByTenantIdAndDentistId(
      tenantId,
      dentistId
    );

    if (!dentist) {
      throw new CustomError("Dentist not found", 404);
    }

    // 1. Convert DB to frontend format
    const formatted = helper.convertDbToFrontend(
      dentist,
      dentistFieldReverseMap
    );

    // 2. Fetch documents
    const [profileDocs, awardDocs] = await Promise.all([
      getDocumentsByField("dentist", dentistId, "profile_picture"),
      getDocumentsByField("dentist", dentistId, "awards_certifications"),
    ]);

    // 3. Map document data
    const profile_picture = profileDocs.map((doc) => ({
      document_id: doc.document_id,
      file_url: doc.file_url,
    }));

    const awards_certifications = awardDocs.map((doc) => ({
      document_id: doc.document_id,
      file_url: doc.file_url,
    }));

    // 4. Return combined response
    return {
      ...formatted,
      profile_picture,
      awards_certifications,
    };
  } catch (error) {
    throw new CustomError(error, 500);
  }
};


// -------------------- DELETE --------------------
const deleteDentistByTenantIdAndDentistId = async (tenantId, dentistId) => {
  try {
    const result = await dentistModel.deleteDentistByTenantIdAndDentistId(
      tenantId,
      dentistId
    );
    await invalidateCacheByPattern("dentist:*");
    return result;
  } catch (error) {
    throw new CustomError(error, 500);
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

        // 📎 Get profile_picture documents
        const profilePics = await getDocumentsByField(
          "dentist",
          dentist.dentist_id,
          "profile_picture"
        );
        const profile_picture = profilePics.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        // 🏆 Get awards_certifications documents
        const awards = await getDocumentsByField(
          "dentist",
          dentist.dentist_id,
          "awards_certifications"
        );
        const awards_certifications = awards.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          profile_picture,
          awards_certifications,
        };
      })
    );

    return { data: convertedRows, total: dentists.total };
  } catch (error) {
    console.log(error)
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
