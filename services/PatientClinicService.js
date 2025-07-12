const { CustomError } = require("../middlewares/CustomeError");
const patient_clinicModel = require("../models/PatientClinicModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");
const { buildCacheKey } = require("../utils/RedisCache");

// Field mapping for patient_clinics (similar to treatment)

const patient_clinicFields = {
  patient_id: (val) => val,
  clinic_id: (val) => val,
};
const patient_clinicFieldsReverseMap = {
  patient_clinic_id: (val) => val,
  patient_id: (val) => val,
  clinic_id: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create PatientClinic
const createPatientClinic = async (data) => {
  const fieldMap = {
    ...patient_clinicFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const patient_clinicId = await patient_clinicModel.createPatientClinic(
      "patient_clinic",
      columns,
      values
    );
    return patient_clinicId;
  } catch (error) {
    console.error("Failed to create patient_clinic:", error);
    throw new CustomError(`Failed to create patient_clinic: ${error.message}`, 404);
  }
};

// Get All PatientClinics by Tenant ID with Caching
const getAllPatientClinicsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  try {
   
      const result = await patient_clinicModel.getAllPatientClinicsByTenantId(
        tenantId,
        Number(limit),
        offset
      );

    const convertedRows = result.data.map((patient_clinic) =>
      helper.convertDbToFrontend(patient_clinic, patient_clinicFieldsReverseMap)
    );

    return { data: convertedRows, total: result.total };
  } catch (err) {
    console.error("Database error while fetching patient_clinics:", err);
    throw new CustomError("Failed to fetch patient_clinics", 404);
  }
};

// Get PatientClinic by ID & Tenant
const getPatientClinicByTenantIdAndPatientClinicId = async (tenantId, patient_clinicId) => {
  try {
    const patient_clinic = await patient_clinicModel.getPatientClinicByTenantAndPatientClinicId(
      tenantId,
      patient_clinicId
    );

    const convertedRows = helper.convertDbToFrontend(
      patient_clinic,
      patient_clinicFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get patient_clinic: " + error.message, 404);
  }
};

// Update PatientClinic
const updatePatientClinic = async (patient_clinicId, data, tenant_id) => {
  const fieldMap = {
    ...patient_clinicFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await patient_clinicModel.updatePatientClinic(
      patient_clinicId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("PatientClinic not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("patient_clinic:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update patient_clinic", 404);
  }
};

// Delete PatientClinic
const deletePatientClinicByTenantIdAndPatientClinicId = async (
  tenantId,
  patient_clinicId
) => {
  try {
    const affectedRows =
      await patient_clinicModel.deletePatientClinicByTenantAndPatientClinicId(
        tenantId,
        patient_clinicId
      );
    if (affectedRows === 0) {
      throw new CustomError("PatientClinic not found.", 404);
    }

    await invalidateCacheByPattern("patient_clinic:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete patient_clinic: ${error.message}`, 404);
  }
};

const getAllPatientClinicsByTenantIdAndClinicId = async (
  tenantId,
  clinic_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;

  try {
      const result = await patient_clinicModel.getAllPatientClinicsByTenantIdAndClinicId(
        tenantId,
        clinic_id,
        Number(limit),
        offset
      );

    const convertedRows = result.data.map((patient_clinic) =>
      helper.convertDbToFrontend(patient_clinic, patient_clinicFieldsReverseMap)
    );

    return { data: convertedRows, total: result.total };
  } catch (err) {
    console.error("Database error while fetching patient_clinics:", err);
    throw new CustomError("Failed to fetch patient_clinics", 404);
  }
};

module.exports = {
  createPatientClinic,
  getAllPatientClinicsByTenantId,
  getPatientClinicByTenantIdAndPatientClinicId,
  updatePatientClinic,
  deletePatientClinicByTenantIdAndPatientClinicId,
  getAllPatientClinicsByTenantIdAndClinicId
};
