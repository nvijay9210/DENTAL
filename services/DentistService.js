const { CustomError } = require("../middlewares/CustomeError");
const dentistModel = require("../models/DentistModel"); // Make sure this model exists
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields, mapBooleanFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const { formatDateOnly } = require("../utils/DateUtils");

const helper = require("../utils/Helpers");

const dentistFieldMap = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  first_name: (val) => val,
  last_name: (val) => val,
  gender: (val) => val,
  date_of_birth: formatDateOnly,
  email: (val) => val,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val,

  specialisation: (val) => val,
  designation: (val) => val,
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

  experience_years: (val) => parseInt(val) || 0,
  license_number: (val) => val,
  clinic_name: (val) => val,
  clinic_address: (val) => val,
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pin_code: (val) => val,

  consultation_fee: (val) => parseFloat(val) || 0,
  min_booking_fee: (val) => parseFloat(val) || 0,
  ratings: (val) => parseFloat(val) || 0,
  reviews_count: (val) => parseInt(val) || 0,
  appointment_count: (val) => parseInt(val) || 0,

  profile_picture: (val) => val || null,

  teleconsultation_supported: helper.parseBoolean,
  insurance_supported: helper.parseBoolean,

  last_login: (val) => val,
  duration: helper.duration,
};
const dentistFieldReverseMap = {
  dentist_id:val=>val,
  tenant_id: val => val,
  clinic_id: val => val,
  first_name: val => val,
  last_name: val => val,
  gender: val => val,
  date_of_birth: val => val ? new Date(val).toISOString().split('T')[0] : null,
  email: val => val,
  phone_number: val => val,
  alternate_phone_number: val => val,
  specialisation: (val) => val,

  designation: (val) => val,
  languages_spoken: val => helper.safeJsonParse(val),
  working_hours: val => helper.safeJsonParse(val),
  available_days: val => helper.safeJsonParse(val),
  bio: val => helper.safeJsonParse(val),
  social_links: val => helper.safeJsonParse(val),
  social_activities: val => helper.safeJsonParse(val),
  internship: val => helper.safeJsonParse(val),
  position_held: val => helper.safeJsonParse(val),
  research_projects: val => helper.safeJsonParse(val),
  publication: val => helper.safeJsonParse(val),
  awards_certifications: val => helper.safeJsonParse(val),
  member_of: val => helper.safeJsonParse(val),

  experience_years: val => parseInt(val) || 0,
  license_number: val => val,
  clinic_name: val => val,
  clinic_address: val => val,
  city: val => val,
  state: val => val,
  country: val => val,
  pin_code: val => val,

  consultation_fee: val => parseFloat(val) || 0,
  min_booking_fee: val => parseFloat(val) || 0,
  ratings: val => parseFloat(val) || 0,
  reviews_count: val => parseInt(val) || 0,
  appointment_count: val => parseInt(val) || 0,

  profile_picture: val => val,
  teleconsultation_supported: val => Boolean(val),
  insurance_supported: val => Boolean(val),

  last_login: val => val,
  duration: val => val,
};


// -------------------- CREATE --------------------
const createDentist = async (data) => {
  const create = {
    ...dentistFieldMap,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, create);
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
    throw new CustomError(`Failed to create dentist: ${error.message}`, 404);
  }
};

// -------------------- UPDATE --------------------
const updateDentist = async (dentistId, data, tenant_id) => {
  const update = {
    ...dentistFieldMap,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, update);
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
    throw new CustomError(`Failed to update dentist: ${error.message}`, 404);
  }
};

// -------------------- GET ALL --------------------
const getAllDentistsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `dentists:${tenantId}:page:${page}:limit:${limit}`;

  
  try {
    const dentists = await getOrSetCache(cacheKey, async () => {
      return await dentistModel.getAllDentistsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
    });

    const convertedRows = dentists.data.map(dentist => helper.convertDbToFrontend(dentist, dentistFieldReverseMap)).map(flattenAwards);

    return {data:convertedRows,total:dentists.total};
  } catch (err) {
    console.error("Database error while fetching dentists:", err.message);
    throw new CustomError("Database error while fetching dentists", 404);
  }
};

function flattenAwards(dentist) {
  const flattened = {};

  if (Array.isArray(dentist.awards_certifications)) {
    dentist.awards_certifications.forEach((cert, index) => {
      flattened[`awards_certifications_${index}`] = cert.image || "";
      flattened[`description_awards_certifications_${index}`] =
        cert.description || "";
    });
  }

  // Remove original field if not needed
  delete dentist.awards_certifications;

  return {
    ...dentist,
    ...flattened,
  };
}

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

    const convertedRows= converthelper.convertDbToFrontend(dentist, dentistFieldReverseMap)
    flattenAwards(dentist);
    return { ...convertedRows, flattenAwards };
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
    throw new CustomError(`Failed to delete dentist: ${error.message}`, 404);
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
  page,
  limit
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `dentistsbyclinic:${tenantId}:${clinicId}:page:${page}:limit:${limit}`;

  try {
    const dentists = await getOrSetCache(cacheKey, async () => {
      return await dentistModel.getAllDentistsByTenantIdAndClinicId(
        tenantId,
        clinicId,
        Number(limit),
        offset
      );
    });

    const convertedRows = dentists.data.map(dentist => helper.convertDbToFrontend(dentist, dentistFieldReverseMap)).map(flattenAwards);

    return {data:convertedRows,total:dentists.total};
  } catch (error) {
    throw new CustomError(
      `Failed to check dentist existence: ${error.message}`,
      404
    );
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
    await invalidateCacheByPattern("dentists:*");
    await invalidateCacheByPattern("dentistsbyclinic:*");
    return result;
  } catch (error) {
    throw new CustomError(`Failed to delete dentist: ${error.message}`, 404);
  }
};

const updateNullClinicInfoWithJoin = async (tenantId, clinicId, dentistId) => {
  try {
    const result = await dentistModel.updateNullClinicInfoWithJoin(
      tenantId,
      clinicId,
      dentistId
    );
    await invalidateCacheByPattern("dentists:*");
    await invalidateCacheByPattern("dentistsbyclinic:*");
    return result;
  } catch (error) {
    throw new CustomError(`Failed to delete dentist: ${error.message}`, 404);
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
