const { CustomError } = require("../middlewares/CustomeError");
const patientModel = require("../models/PatientModel");
const {
  redisClient,
  invalidateCacheByPattern,
  getOrSetCache,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { formatDateOnly } = require("../utils/DateUtils");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const patiendFields = {
  tenant_id: (val) => val,
  first_name: (val) => val,
  last_name: (val) => val,
  email: (val) => val || null,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val || null,
  date_of_birth: (val) => val?formatDateOnly(val):null,
  gender: (val) => val,
  blood_group: (val) => val || null,
  address: (val) => val || null,
  city: (val) => val || null,
  state: (val) => val || null,
  country: (val) => val || null,
  pin_code: (val) => val || null,
  profession: (val) => val || null,
  referred_by: (val) => val || null,
  tooth_details: helper.safeStringify,
  smoking_status: (val) => val,
  alcohol_consumption: (val) => val,
  emergency_contact_name: (val) => val || null,
  emergency_contact_number: (val) => val || null,
  insurance_provider: (val) => val || null,
  insurance_policy_number: (val) => val || null,
  profile_picture: (val) => val || null,
};

const patientFieldsReverseMap = {
  patient_id: (val) => val,
  tenant_id: (val) => val,
  first_name: (val) => val,
  last_name: (val) => val,
  email: (val) => val,
  phone_number: (val) => val,
  alternate_phone_number: (val) => val,
  date_of_birth: (val) =>
    val ? formatDateOnly(val):null,
  gender: (val) => val,
  blood_group: (val) => val,
  address: (val) => helper.safeJsonParse(val),
  city: (val) => val,
  state: (val) => val,
  country: (val) => val,
  pin_code: (val) => val,
  profession: (val) => val,
  referred_by: (val) => val,
  tooth_details: helper.safeJsonParse,
  treatment_history: helper.safeJsonParse,
  pre_history: helper.safeJsonParse,
  current_medication: helper.safeJsonParse,
  smoking_status: (val) => val,
  alcohol_consumption: (val) => val,
  emergency_contact_name: (val) => val,
  emergency_contact_number: (val) => val,
  insurance_provider: (val) => val,
  insurance_policy_number: (val) => val,
  profile_picture: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? new Date(val).toISOString() : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? new Date(val).toISOString() : null),
};

// Create patient
const createPatient = async (data) => {
  const create = {
    ...patiendFields,
    created_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, create);
    const patientId = await patientModel.createPatient(
      "patient",
      columns,
      values
    );
    await invalidateCacheByPattern("patients:*");
    return patientId;
  } catch (error) {
    console.trace(error);
    throw new CustomError(`Failed to create patient: ${error.message}`, 404);
  }
};

const getAllPatientsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `patients:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const patients = await getOrSetCache(cacheKey, async () => {
      const result = await patientModel.getAllPatientsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      console.log("✅ Serving patients from DB and caching result");
      return result;
    });

    const convertedRows = patients.map((patient) =>
      helper.convertDbToFrontend(patient, patientFieldsReverseMap)
    );

    return convertedRows;
  } catch (error) {
    console.error(error);
    throw new CustomError("Database error while fetching patients", 404);
  }
};

// Get single patient
const getPatientByTenantIdAndPatientId = async (tenantId, patientId) => {
  try {
    const patient = await patientModel.getPatientByTenantIdAndPatientId(
      tenantId,
      patientId
    );
    const convertedRows = helper.convertDbToFrontend(
      patient,
      patientFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get patient: " + error.message, 404);
  }
};

// Check existence
const checkPatientExistsByTenantIdAndPatientId = async (
  tenantId,
  patientId
) => {
  try {
    return await patientModel.checkPatientExistsByTenantIdAndPatientId(
      tenantId,
      patientId
    );
  } catch (error) {
    throw new CustomError("Failed to check patient: " + error.message, 404);
  }
};

// Update patient
const updatePatient = async (patientId, data, tenant_id) => {
  const update = {
    ...patiendFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, update);
    const affectedRows = await patientModel.updatePatient(
      patientId,
      columns,
      values,
      tenant_id
    );
    if (affectedRows === 0) {
      throw new CustomError("Patient not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("patients:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update patient", 404);
  }
};

// Delete patient
const deletePatientByTenantIdAndPatientId = async (tenantId, patientId) => {
  try {
    const affectedRows = await patientModel.deletePatientByTenantIdAndPatientId(
      tenantId,
      patientId
    );
    if (affectedRows === 0) {
      throw new CustomError("Patient not found.", 404);
    }

    await invalidateCacheByPattern("patients:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete patient: ${error.message}`, 404);
  }
};

const updateToothDetails = async (data, patientId, tenant_id) => {
  console.log(data);
  data = data.length > 0 ? JSON.stringify(data) : null;
  try {
    const affectedRows = await patientModel.updateToothDetails(
      data,
      patientId,
      tenant_id
    );
    if (affectedRows === 0) {
      throw new CustomError("Patient not found.", 404);
    }

    await invalidateCacheByPattern("patients:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete patient: ${error.message}`, 404);
  }
};

module.exports = {
  createPatient,
  getAllPatientsByTenantId,
  getPatientByTenantIdAndPatientId,
  checkPatientExistsByTenantIdAndPatientId,
  updatePatient,
  deletePatientByTenantIdAndPatientId,
  updateToothDetails,
};
