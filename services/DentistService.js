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

const dentistFieldMap = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  first_name: (val) => val,
  last_name: (val) => val,
  gender: (val) => val,
  date_of_birth: (val) => val,
  email: (val) => val,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val,

  specialization: safeStringify,
  qualifications: safeStringify,
  languages_spoken: safeStringify,
  working_hours: safeStringify,
  available_days: safeStringify,
  bio: safeStringify,
  social_links: safeStringify,

  experience_years: (val) => val,
  license_number: (val) => val,
  clinic_name: (val) => val,
  clinic_address: (val) => val,
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pin_code: (val) => val,

  consultation_fee: (val) => val || 0,
  ratings: (val) => val || 0,
  reviews_count: (val) => val || 0,
  appointment_count: (val) => val || 0,

  profile_picture: (val) => val || null,

  teleconsultation_supported: parseBoolean,
  insurance_supported: parseBoolean,

  awards_certifications: safeStringify, // or keep as raw string if needed

  last_login: (val) => val || null,
  created_by: (val) => val,
  updated_by: (val) => val || null,
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
    "awards_certifications"
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

    const parsed = decodeJsonFields(dentists, jsonFields);

    parsed.forEach((d) => {
      mapBooleanFields(d, booleanFields);
      if (d.date_of_birth) {
        d.date_of_birth = formatDateOnly(d.date_of_birth);
      }
    });

    return parsed;
  } catch (err) {
    console.error("Database error while fetching dentists:", err.message);
    throw new CustomError("Database error while fetching dentists", 500);
  }
};

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
    return dentist;
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
  const cacheKey = `dentistsbyclinic:${tenantId}:page:${page}:limit:${limit}`;
  const jsonFields = ["specialization"];
  try {
    const dentists = await getOrSetCache(cacheKey, async () => {
      return await dentistModel.getAllDentistsByTenantIdAndClinicId(
        tenantId,
        clinicId,
        Number(limit),
        offset
      );
    });

    console.log("dentists:", dentists);

    const parsed = decodeJsonFields(dentists, jsonFields);
    return parsed;
  } catch (error) {
    throw new CustomError(
      `Failed to check dentist existence: ${error.message}`,
      500
    );
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
};
