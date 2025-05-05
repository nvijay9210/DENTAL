const { CustomError } = require("../middlewares/CustomeError");
const clinicModel = require("../models/ClinicModel");
const {
  redisClient,
  invalidateCacheByTenant,
  getOrSetCache,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const helper = require("../utils/Helpers");
const { mapFields } = require("../query/Records");

// -------------------- FIELD MAP --------------------
const clinicFieldMap = {
  tenant_id: (val) => val,
  clinic_name: (val) => val,
  email: (val) => val || null,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val || null,
  branch: (val) => val || null,
  website: (val) => val || null,
  address: (val) => val,
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pin_code: (val) => val,
  license_number: (val) => val,
  gst_number: (val) => val || null,
  pan_number: (val) => val || null,
  established_year: (val) => val,
  total_doctors: (val) => val || null,
  total_patients: (val) => val || null,
  total_dental_chairs: (val) => val || null,
  number_of_assistants: (val) => val || null,
  available_services: (val) => JSON.stringify(val),
  operating_hours: (val) => JSON.stringify(val),
  insurance_supported: (val) => (val ? 1 : 0),
  ratings: (val) => val || 0,
  reviews_count: (val) => val || 0,
  emergency_support: (val) => (val ? 1 : 0),
  teleconsultation_supported: (val) => (val ? 1 : 0),
  clinic_logo: (val) => val || null,
  parking_availability: (val) => (val ? 1 : 0),
  pharmacy: (val) => (val ? 1 : 0),
  wifi: (val) => (val ? 1 : 0),
  created_by: (val) => val,
  updated_by: (val) => val,
};

// -------------------- CREATE --------------------
const createClinic = async (data) => {
  try {
    const { columns, values } = mapFields(data, clinicFieldMap);
    const clinicId = await clinicModel.createClinic("clinic", columns, values);
    await invalidateCacheByTenant("clinic", data.tenant_id);
    return clinicId;
  } catch (error) {
    console.trace(error);
    throw new CustomError(`Failed to create clinic: ${error.message}`, 404);
  }
};

// -------------------- UPDATE --------------------
const updateClinic = async (clinicId, data, tenant_id) => {
  try {
    const { columns, values } = mapFields(data, clinicFieldMap);
    const affectedRows = await clinicModel.updateClinic(clinicId, columns, values, tenant_id);

    if (affectedRows === 0) {
      throw new CustomError("Clinic not found or no changes made.", 404);
    }

    await invalidateCacheByTenant("clinic", tenant_id);
    return affectedRows;
  } catch (error) {
    console.log("Service Error:", error);
    throw new CustomError("Failed to update clinic", 404);
  }
};

// -------------------- JSON SAFE PARSE --------------------
function safeJsonParse(value) {
  try {
    if (typeof value === "string") {
      const parsed = JSON.parse(value);
      return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
    }
    return value;
  } catch (err) {
    console.error("Failed to parse JSON:", err.message);
    return value;
  }
}

// -------------------- GET ALL --------------------
const getAllClinicsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `clinics:${tenantId}:page:${page}:limit:${limit}`;
  const booleanFields = [
    "insurance_supported",
    "emergency_support",
    "teleconsultation_supported",
    "parking_availability",
    "pharmacy",
    "wifi",
  ];

  try {
    const clinics = await getOrSetCache(cacheKey, async () => {
      const result = await clinicModel.getAllClinicsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      console.log("✅ Serving clinics from DB and caching result");
      return result;
    });

    if (clinics && clinics.length > 0) {
      clinics.forEach((clinic) => {
        clinic.available_services = safeJsonParse(clinic.available_services);
        clinic.operating_hours = safeJsonParse(clinic.operating_hours);
        helper.mapBooleanFields(clinic, booleanFields);
      });
    }

    return clinics;
  } catch (error) {
    console.error(error);
    throw new CustomError("Database error while fetching clinics", 404);
  }
};

// -------------------- GET SINGLE --------------------
const getClinicByTenantIdAndClinicId = async (tenantId, clinicId) => {
  const fieldsToDecode = ["available_services", "operating_hours"];
  const booleanFields = [
    "insurance_supported",
    "emergency_support",
    "teleconsultation_supported",
    "parking_availability",
    "pharmacy",
    "wifi",
  ];

  try {
    const clinic = await clinicModel.getClinicByTenantIdAndClinicId(tenantId, clinicId);
    if (clinic) {
      await decodeJsonFields(clinic, fieldsToDecode);
      helper.mapBooleanFields(clinic, booleanFields);
    }
    return clinic;
  } catch (error) {
    throw new CustomError("Failed to get clinic: " + error.message, 404);
  }
};

// -------------------- CHECK EXISTS --------------------
const checkClinicExistsByTenantIdAndClinicId = async (tenantId, clinicId) => {
  try {
    return await clinicModel.checkClinicExistsByTenantIdAndClinicId(tenantId, clinicId);
  } catch (error) {
    throw new CustomError("Failed to check clinic existence: " + error.message, 404);
  }
};

module.exports = {
  createClinic,
  updateClinic,
  getAllClinicsByTenantId,
  getClinicByTenantIdAndClinicId,
  checkClinicExistsByTenantIdAndClinicId,
};
