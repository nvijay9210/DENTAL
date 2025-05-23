const { CustomError } = require("../middlewares/CustomeError");
const clinicModel = require("../models/ClinicModel");
const {
  invalidateCacheByPattern,
  getOrSetCache,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const helper = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const {
  updateClinicIdAndNameAndAddress,
  updateNullClinicInfoWithJoin,
} = require("../services/DentistService");

const message = require("../middlewares/ErrorMessages");

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
  available_services: (val) => (val ? JSON.stringify(val) : null),
  operating_hours: (val) => (val ? JSON.stringify(val) : null),
  insurance_supported: helper.parseBoolean,
  ratings: (val) => val || 0,
  reviews_count: (val) => val || 0,
  emergency_support: helper.parseBoolean,
  teleconsultation_supported: helper.parseBoolean,
  clinic_logo: (val) => val || null,
  parking_availability: helper.parseBoolean,
  pharmacy: helper.parseBoolean,
  wifi: helper.parseBoolean,
};

const clinicFieldReverseMap = {
  clinic_id:val=>val,
  tenant_id: val => val,
  clinic_name: val => val,
  email: val => val,
  phone_number: val => val,
  alternate_phone_number: val => val,
  branch: val => val,
  website: val => val,
  address: val => val,
  city: val => val,
  state: val => val,
  country: val => val,
  pin_code: val => val,
  license_number: val => val,
  gst_number: val => val,
  pan_number: val => val,
  established_year: val => parseInt(val) || 0,
  total_doctors: val => parseInt(val) || null,
  total_patients: val => parseInt(val) || null,
  total_dental_chairs: val => parseInt(val) || null,
  number_of_assistants: val => parseInt(val) || null,
  available_services: val => helper.safeJsonParse(val),
  operating_hours: val => helper.safeJsonParse(val),
  insurance_supported: val => Boolean(val),
  ratings: val => parseFloat(val) || 0,
  reviews_count: val => parseInt(val) || 0,
  emergency_support: val => Boolean(val),
  teleconsultation_supported: val => Boolean(val),
  clinic_logo: val => val,
  parking_availability: val => Boolean(val),
  pharmacy: val => Boolean(val),
  wifi: val => Boolean(val),
  created_by: val => val,
  created_time: val => val ? new Date(val).toISOString() : null,
  updated_by: val => val,
  updated_time: val => val ? new Date(val).toISOString() : null
};

// -------------------- CREATE --------------------
const createClinic = async (data) => {
  const createClinicFieldMap = {
    ...clinicFieldMap,
    created_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, createClinicFieldMap);
    const clinicId = await clinicModel.createClinic("clinic", columns, values);
    await invalidateCacheByPattern("clinics:*");
    return clinicId;
  } catch (error) {
    console.trace(error);
    throw new CustomError(message.CLINIC_CREATE_FAIL, 404);
  }
};

// -------------------- UPDATE --------------------
const updateClinic = async (clinicId, data, tenant_id) => {
  const updateClinicFieldMap = {
    ...clinicFieldMap,
    updated_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, updateClinicFieldMap);

    const affectedRows = await clinicModel.updateClinic(
      clinicId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError(message.CLINIC_UPDATE_FAIL, 404);
    }

    await invalidateCacheByPattern("clinics:*");
    return affectedRows;
  } catch (error) {
    console.log("Service Error:", error);
    throw new CustomError(message.CLINICS_FETCH_FAIL, 404);
  }
};

// -------------------- GET ALL --------------------
const getAllClinicsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `clinics:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const clinics = await getOrSetCache(cacheKey, async () => {
      const result = await clinicModel.getAllClinicsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });
  const convertedRows = clinics.map(clinic => helper.convertDbToFrontend(clinic, clinicFieldReverseMap));

    return convertedRows;
  } catch (err) {
    console.error(err);
    throw new CustomError(message.CLINICS_FETCH_FAIL, 404);
  }
};

// -------------------- GET SINGLE --------------------
const getClinicByTenantIdAndClinicId = async (tenantId, clinicId) => {

  try {
    const clinic = await clinicModel.getClinicByTenantIdAndClinicId(
      tenantId,
      clinicId
    );
   
    const convertedRows = helper.convertDbToFrontend(clinic, clinicFieldReverseMap);

    return convertedRows;

  } catch (error) {
    throw new CustomError(message.CLINIC_FETCH_FAIL, 404);
  }
};

const deleteClinicByTenantIdAndClinicId = async (tenantId, clinicId) => {
  try {
    const clinic = await clinicModel.deleteClinicByTenantIdAndClinicId(
      tenantId,
      clinicId
    );
    await invalidateCacheByPattern("clinics:*");
    return clinic;
  } catch (error) {
    throw new CustomError(message.CLINIC_DELETE_FAIL, 404);
  }
};

// -------------------- CHECK EXISTS --------------------
const checkClinicExistsByTenantIdAndClinicId = async (tenantId, clinicId) => {
  try {
    return await clinicModel.checkClinicExistsByTenantIdAndClinicId(
      tenantId,
      clinicId
    );
  } catch (error) {
    throw new CustomError(message.CLINIC_CREATE_FAIL, 404);
  }
};

const handleClinicAssignment = async (
  tenantId,
  clinicId,
  details,
  assign = true
) => {
  try {
    if (assign === "true") {
      const clinic = await clinicModel.getClinicNameAndAddressByClinicId(
        tenantId,
        clinicId
      );

      const dentistIds = details?.dentist_id;
      if (!Array.isArray(dentistIds) || dentistIds.length === 0) {
        throw new CustomError("At least one dentistId is required", 404);
      }

      const updatedDentists = await Promise.all(
        dentistIds.map((dentistId) =>
          updateClinicIdAndNameAndAddress(
            tenantId,
            clinicId,
            clinic.clinic_name,
            clinic.address,
            dentistId
          )
        )
      );

      await clinicModel.updateDoctorCount(tenantId, clinicId, assign);
      await invalidateCacheByPattern("clinics:*");

      return "Dentists Added Successfully";
    } else {
      const dentistIds = details?.dentist_id;
      if (!Array.isArray(dentistIds) || dentistIds.length === 0) {
        throw new CustomError("At least one dentistId is required", 404);
      }

      await Promise.all(
        dentistIds.map((dentistId) =>
          updateNullClinicInfoWithJoin(tenantId, clinicId, dentistId)
        )
      );

      await clinicModel.updateDoctorCount(tenantId, clinicId, assign);
      await invalidateCacheByPattern("clinics:*");

      return "Dentists Removed Successfully";
    }
  } catch (error) {
    console.error("Error in handleClinicAssignment:", error);
    throw new CustomError(
      `Failed to update clinic assignment: ${error.message}`,
      404
    );
  }
};

module.exports = {
  createClinic,
  updateClinic,
  getAllClinicsByTenantId,
  getClinicByTenantIdAndClinicId,
  checkClinicExistsByTenantIdAndClinicId,
  deleteClinicByTenantIdAndClinicId,
  handleClinicAssignment,
};
