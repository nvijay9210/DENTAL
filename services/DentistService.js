const { CustomError } = require("../middlewares/CustomeError");
const dentistModel = require("../models/DentistModel"); // Make sure this model exists
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields, mapBooleanFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const { formatDateOnly } = require("../utils/DateUtils");

// Helper: Convert truthy values to 1/0
const parseBoolean = (val) => {
  if (val === true || val === "true" || val === 1 || val === "1") return 1;
  return 0;
};

// Field Mapping for Dentist
function safeStringify(val) {
  if (!val) return null;
  try {
    JSON.parse(val); // Check if already valid JSON string
    return val;
  } catch {
    return JSON.stringify(val);
  }
}

function sanitizeValue(value) {
  return ['null', '', undefined, NaN].includes(value) ? null : value;
}

const dentistFieldMap = {
  tenant_id: (val) => val,
  clinic_id: (val) => sanitizeValue(val),
  first_name: (val) => val,
  last_name: (val) => val,
  gender: (val) => val,
  date_of_birth: (val) => {
    if (val === 'null' || !val) return null;
    // Optional: validate date format
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  },
  email: (val) => sanitizeValue(val),
  phone_number: (val) => val,
  alternate_phone_number: (val) => sanitizeValue(val),

  specialization: safeStringify,
  qualifications: safeStringify,
  languages_spoken: safeStringify,
  working_hours: safeStringify,
  available_days: safeStringify,
  bio: safeStringify,
  social_links: safeStringify,

  experience_years: (val) => parseInt(val) || 0,
  license_number: (val) => val,
  clinic_name: (val) => sanitizeValue(val),
  clinic_address: (val) => sanitizeValue(val),
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pin_code: (val) => val,

  consultation_fee: (val) => parseFloat(val) || 0,
  ratings: (val) => parseFloat(val) || 0,
  reviews_count: (val) => parseInt(val) || 0,
  appointment_count: (val) => parseInt(val) || 0,

  profile_picture: (val) => sanitizeValue(val),

  teleconsultation_supported: parseBoolean,
  insurance_supported: parseBoolean,

  awards_certifications: safeStringify,
  member_of: safeStringify,

  last_login: (val) => sanitizeValue(val),
  duration: (val) => sanitizeValue(val),
  created_by: (val) => val,
  updated_by: (val) => sanitizeValue(val),
};


// -------------------- CREATE --------------------
const createDentist = async (data) => {
  try {
    const { columns, values } = mapFields(data, dentistFieldMap);
    const dentistId = await dentistModel.createDentist(
      "dentist",
      columns,
      values
    );
    await invalidateCacheByPattern("dentists:*");
    await invalidateCacheByPattern("dentistsbyclinic:*");
    return dentistId;
  } catch (error) {
    console.error("Failed to create dentist:", error.message);
    throw new CustomError(`Failed to create dentist: ${error.message}`, 500);
  }
};

// -------------------- UPDATE --------------------
const updateDentist = async (dentistId, data, tenant_id) => {
  try {
    const { columns, values } = mapFields(data, dentistFieldMap);
    const affectedRows = await dentistModel.updateDentist(
      dentistId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Dentist not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("dentists:*");
    await invalidateCacheByPattern("dentistsbyclinic:*");
    return affectedRows;
  } catch (error) {
    console.error("Failed to update dentist:", error.message);
    throw new CustomError(`Failed to update dentist: ${error.message}`, 500);
  }
};

// -------------------- GET ALL --------------------
const getAllDentistsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `dentists:${tenantId}:page:${page}:limit:${limit}`;

  const jsonFields = [
    "specialization",
    "qualifications",
    "working_hours",
    "available_days",
    "bio",
    "languages_spoken",
    "social_links",
    "awards_certifications",
    "duration",
    "member_of"
  ];
  const booleanFields = ["teleconsultation_supported", "insurance_supported"];

  try {
    const dentists = await getOrSetCache(cacheKey, async () => {
      return await dentistModel.getAllDentistsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
    });

    const parsed = decodeJsonFields(dentists, jsonFields)
      .map(d => {
        mapBooleanFields(d, booleanFields);
        if (d.date_of_birth) {
          d.date_of_birth = formatDateOnly(d.date_of_birth);
        }
        return d;
      })
      .map(flattenAwards);

    return parsed;
  } catch (err) {
    console.error("Database error while fetching dentists:", err.message);
    throw new CustomError("Database error while fetching dentists", 500);
  }
};

function flattenAwards(dentist) {
  const flattened = {};

  if (Array.isArray(dentist.awards_certifications)) {
    dentist.awards_certifications.forEach((cert, index) => {
      flattened[`awards_certifications_${index}`] = cert.image || "";
      flattened[`description_awards_certifications_${index}`] = cert.description || "";
    });
  }

  // Remove original field if not needed
  delete dentist.awards_certifications;

  return {
    ...dentist,
    ...flattened
  };
}

// -------------------- GET SINGLE --------------------
const getDentistByTenantIdAndDentistId = async (tenantId, dentistId) => {
  const jsonFields = [
    "specialization",
    "qualifications",
    "working_hours",
    "available_days",
    "bio",
    "languages_spoken",
    "social_links",
    "duration",
    "member_of"
  ];
  const booleanFields = ["teleconsultation_supported", "insurance_supported"];

  try {
    const dentist = await dentistModel.getDentistByTenantIdAndDentistId(
      tenantId,
      dentistId
    );
    if (!dentist) {
      throw new CustomError("Dentist not found", 404);
    }

    await decodeJsonFields([dentist], jsonFields);
    mapBooleanFields(dentist, booleanFields);
    flattenAwards(dentist);
    return {...dentist,flattenAwards};
  } catch (error) {
    throw new CustomError(`Failed to get dentist: ${error.message}`, 404);
  }
};

// -------------------- DELETE --------------------
const deleteDentistByTenantIdAndDentistId = async (tenantId, dentistId) => {
  try {
    const result = await dentistModel.deleteDentistByTenantIdAndDentistId(
      tenantId,
      dentistId
    );
    await invalidateCacheByPattern("dentists:*");
    await invalidateCacheByPattern("dentistsbyclinic:*");
    return result;
  } catch (error) {
    throw new CustomError(`Failed to delete dentist: ${error.message}`, 500);
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
      500
    );
  }
};

const getAllDentistsByTenantIdAndClinicId = async (
  tenantId,
  clinicId,
  page,
  limit
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `dentistsbyclinic:${tenantId}:${clinicId}:page:${page}:limit:${limit}`;
  const jsonFields = ["specialization", "awards_certifications"]; // ✅ Added awards

  try {
    const dentists = await getOrSetCache(cacheKey, async () => {
      return await dentistModel.getAllDentistsByTenantIdAndClinicId(
        tenantId,
        clinicId,
        Number(limit),
        offset
      );
    });

    const parsed = decodeJsonFields(dentists, jsonFields).map(dentist => {
      // ✅ Optionally flatten for form use
      return flattenAwards(dentist);
    });

    return parsed;
  } catch (error) {
    throw new CustomError(
      `Failed to check dentist existence: ${error.message}`,
      500
    );
  }
};

const updateClinicIdAndNameAndAddress = async (tenantId,clinicId,clinic_name,clinic_addrss,dentistId) => {
  try {
    const result = await dentistModel.updateClinicIdAndNameAndAddress(
      tenantId,clinicId,clinic_name,clinic_addrss,dentistId
    );
    await invalidateCacheByPattern("dentists:*");
    await invalidateCacheByPattern("dentistsbyclinic:*");
    return result;
  } catch (error) {
    throw new CustomError(`Failed to delete dentist: ${error.message}`, 500);
  }
};

const updateNullClinicInfoWithJoin = async (tenantId,clinicId, dentistId) => {
  try {
    const result = await dentistModel.updateNullClinicInfoWithJoin(
      tenantId, clinicId,dentistId
    );
    await invalidateCacheByPattern("dentists:*");
    await invalidateCacheByPattern("dentistsbyclinic:*");
    return result;
  } catch (error) {
    throw new CustomError(`Failed to delete dentist: ${error.message}`, 500);
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
  updateNullClinicInfoWithJoin
};
