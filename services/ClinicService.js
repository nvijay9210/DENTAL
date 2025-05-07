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

// -------------------- CREATE --------------------
const createClinic = async (data) => {
  const parseBoolean = (val) => {
    if (val === true || val === 'true' || val === 1 || val === '1') return 1;
    return 0;
  };
  
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
    available_services: (val) => val ? JSON.stringify(val) : null,
    operating_hours: (val) => val ? JSON.stringify(val) : null,
    insurance_supported: parseBoolean,
    ratings: (val) => val || 0,
    reviews_count: (val) => val || 0,
    emergency_support: parseBoolean,
    teleconsultation_supported: parseBoolean,
    clinic_logo: (val) => val || null,
    parking_availability: parseBoolean,
    pharmacy: parseBoolean,
    wifi: parseBoolean,
    created_by: (val) => val
  };
  
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
  console.log('data:',data)
  const parseBoolean = (val) => {
    if (val === true || val === 'true' || val === 1 || val === '1') return 1;
    return 0;
  };
  
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
    available_services: (val) => val ? JSON.stringify(val) : null,
    operating_hours: (val) => val ? JSON.stringify(val) : null,
    insurance_supported: parseBoolean,
    ratings: (val) => val || 0,
    reviews_count: (val) => val || 0,
    emergency_support: parseBoolean,
    teleconsultation_supported: parseBoolean,
    clinic_logo: (val) => val || null,
    parking_availability: parseBoolean,
    pharmacy: parseBoolean,
    wifi: parseBoolean,
    updated_by: (val) => val
  };
  
  try {
    const { columns, values } = mapFields(data, clinicFieldMap);
    console.log(columns,'=',values)
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



// -------------------- GET ALL --------------------
const getAllClinicsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `clinics:${tenantId}:page:${page}:limit:${limit}`;

  const jsonFields = ["available_services", "operating_hours"];
  const booleanFields = [
    "insurance_supported", "emergency_support", "teleconsultation_supported",
    "parking_availability", "pharmacy", "wifi"
  ];

  try {
    const clinics = await getOrSetCache(cacheKey, async () => {
      const result = await clinicModel.getAllClinicsByTenantId(tenantId, Number(limit), offset);
      return result;
    });

    const parsed = helper.decodeJsonFields(clinics, jsonFields);
    parsed.forEach((c) => helper.mapBooleanFields(c, booleanFields));
    return parsed;
  } catch (err) {
    console.error(err);
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

const deleteClinicByTenantIdAndClinicId = async (tenantId, clinicId) => {
  try {
    const clinic = await clinicModel.deleteClinicByTenantIdAndClinicId(tenantId, clinicId);
    await invalidateCacheByTenant("clinic", tenantId);
    return clinic;
  } catch (error) {
    throw new CustomError("Failed to delete clinic: " + error.message, 404);
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
  deleteClinicByTenantIdAndClinicId
};
