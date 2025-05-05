const { CustomError } = require("../middlewares/CustomeError");
const dentistModel = require("../models/DentistModel");
const {
  redisClient,
  invalidateCacheByTenant,
  getOrSetCache,
} = require("../config/redisConfig");
const { decodeJsonFields, getJsonValue } = require("../utils/Helpers");
const { formatDateOnly } = require("../utils/DateUtils");
const { mapFields } = require("../query/Records");
const helper=require('../utils/Helpers')
const records=require('../query/Records')

// Create dentist
const createDentist = async (data) => {
 const dentistFieldMap = {
    tenant_id: (val) => val,
  
    // 🧑‍⚕️ Personal Details
    first_name: (val) => val,
    last_name: (val) => val,
    gender: (val) => val || null,
    date_of_birth: (val) => val?.split("T")?.[0] || null,
    email: (val) => val || null,
    phone_number: (val) => val,
    alternate_phone_number: (val) => val || null,
  
    // 🎓 Professional Information
    specialization: (val) => JSON.stringify(val) || null, // JSON, required
    qualifications: (val) => JSON.stringify(val) || null, // JSON, required
    experience_years: (val) => val || 0,
    license_number: (val) => val || 0,
  
    // 🏥 Clinic Information
    clinic_name: (val) => val || null,
    clinic_address: (val) => val || null,
    city: (val) => val || null,
    state: (val) => val || null,
    country: (val) => val || null,
    pin_code: (val) => val || null,
  
    // ⏰ Availability
    working_hours: (val) => JSON.stringify(val) || null,
    available_days: (val) => JSON.stringify(val) || null,
  
    // 💸 Fees & Ratings
    consultation_fee: (val) => val || null,
    ratings: (val) => val || 0,
    reviews_count: (val) => val || 0,
    appointment_count: (val) => val || 0,
  
    // 🖼️ Profile & Media
    profile_picture: (val) => val || null,
    bio: (val) => val || null,
  
    // ✅ Support Features
    teleconsultation_supported: (val) => val?1:0 ,
    insurance_supported: (val) => val?1:0,
  
    // 🌍 Languages & Recognition
    languages_spoken: (val) => JSON.stringify(val) || null,
    awards_certifications: (val) => JSON.stringify(val) || null,
    social_links: (val) => JSON.stringify(val) || null,
  
    // ⏳ Login & Timestamps
    last_login: (val) => val || null,
  
    created_by: (val) => val
  };

  try {
    const {columns,values}=mapFields(data,dentistFieldMap)
    const dentistId = await dentistModel.createDentist("dentist", columns, values);
    await invalidateCacheByTenant("dentist", data.tenant_id);
    return dentistId;
  } catch (error) {
    console.trace(error);
    throw new CustomError(`Failed to create dentist: ${error.message}`, 500);
  }
};

// Get all dentists with cache
const getAllDentistsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `dentists:${tenantId}:page:${page}:limit:${limit}`;
  const fieldsToDecode = ["emergency_contact", "medical_history", "allergies"];

  try {
    const dentists = await getOrSetCache(cacheKey, async () => {
      const result = await dentistModel.getAllDentistsByTenantId(tenantId, Number(limit), offset);
      return decodeJsonFields(result, fieldsToDecode);
    });
    return dentists;
  } catch (error) {
    console.error(error);
    throw new CustomError("Database error while fetching dentists", 500);
  }
};

// Get single dentist
const getDentistByTenantIdAndDentistId = async (tenantId, dentistId) => {
  try {
    const dentist = await dentistModel.getDentistByTenantIdAndDentistId(tenantId, dentistId);
    const fieldsToDecode = ["emergency_contact", "medical_history", "allergies"];
    return decodeJsonFields(dentist, fieldsToDecode);
  } catch (error) {
    throw new CustomError("Failed to get dentist: " + error.message, 500);
  }
};

// Check existence
const checkDentistExistsByTenantIdAndDentistId = async (tenantId, dentistId) => {
  try {
    return await dentistModel.checkDentistExistsByTenantIdAndDentistId(tenantId, dentistId);
  } catch (error) {
    throw new CustomError("Failed to check dentist: " + error.message, 500);
  }
};

// Update dentist
const updateDentist = async (dentistId, data, tenant_id) => {
  const dentistFieldMap = {
    tenant_id: (val) => val,
  
    // 🧑‍⚕️ Personal Details
    first_name: (val) => val,
    last_name: (val) => val,
    gender: (val) => val || null,
    date_of_birth: (val) => val?.split('T')[0] || null,
    email: (val) => val || null,
    phone_number: (val) => val,
    alternate_phone_number: (val) => val || null,
  
    // 🎓 Professional Information
    specialization: (val) => JSON.stringify(val) || [], // JSON, required
    qualifications: (val) => JSON.stringify(val) || [], // JSON, required
    experience_years: (val) => val || 0,
    license_number: (val) => val || 0,
  
    // 🏥 Clinic Information
    clinic_name: (val) => val || null,
    clinic_address: (val) => val || null,
    city: (val) => val || null,
    state: (val) => val || null,
    country: (val) => val || null,
    pin_code: (val) => val || null,
  
    // ⏰ Availability
    working_hours: (val) => JSON.stringify(val) || [],
    available_days: (val) => JSON.stringify(val) || [],
  
    // 💸 Fees & Ratings
    consultation_fee: (val) => val || null,
    ratings: (val) => val || 0,
    reviews_count: (val) => val || 0,
    appointment_count: (val) => val || 0,
  
    // 🖼️ Profile & Media
    profile_picture: (val) => val || null,
    bio: (val) => val || null,
  
    // ✅ Support Features
    teleconsultation_supported: (val) => val?1:0 ,
    insurance_supported: (val) => val?1:0,
  
    // 🌍 Languages & Recognition
    languages_spoken: (val) => JSON.stringify(val) || [],
    awards_certifications: (val) => JSON.stringify(val) || [],
    social_links: (val) => JSON.stringify(val) || [],
  
    // ⏳ Login & Timestamps
    last_login: (val) => val || null,
  
    updated_by: (val) => val
  };
  try {
    const {columns,values}=mapFields(data,dentistFieldMap)
    const affectedRows = await dentistModel.updateDentist(dentistId, columns, values, tenant_id);
    if (affectedRows === 0) {
      throw new CustomError("Dentist not found or no changes made.", 404);
    }

    await invalidateCacheByTenant("dentist", tenant_id);
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update dentist", 500);
  }
};

// Delete dentist
const deleteDentistByTenantIdAndDentistId = async (tenantId, dentistId) => {
  try {
    const affectedRows = await dentistModel.deleteDentistByTenantIdAndDentistId(tenantId, dentistId);
    if (affectedRows === 0) {
      throw new CustomError("Dentist not found.", 404);
    }

    await invalidateCacheByTenant("dentist", tenantId);
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete dentist: ${error.message}`, 500);
  }
};

module.exports = {
  createDentist,
  getAllDentistsByTenantId,
  getDentistByTenantIdAndDentistId,
  checkDentistExistsByTenantIdAndDentistId,
  updateDentist,
  deleteDentistByTenantIdAndDentistId,
};
