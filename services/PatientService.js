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
const helper=require('../utils/Helpers')

// Create patient
const createPatient = async (data) => {

  const fieldMap = {
    tenant_id: (val) => val,
    first_name: (val) => val,
    last_name: (val) => val,
    email: (val) => val || null,
    phone_number: (val) => val,
    alternate_phone_number: (val) => val || null,
    date_of_birth: (val) => val.split('T')[0] || null,
    gender: (val) => val,
    blood_group: (val) => val || null,
    address: (val) => val || null,
    city: (val) => val || null,
    state: (val) => val || null,
    country: (val) => val || null,
    pin_code: (val) => val || null,
    profession: (val) => val || null,
    referred_by: (val) => val || null,
    tooth_details:helper.safeStringify,
    smoking_status: (val) => val,
    alcohol_consumption: (val) => val,
    emergency_contact_name: (val) => val || null,
    emergency_contact_phone: (val) => val || null,
    insurance_provider: (val) => val || null,
    insurance_policy_number: (val) => val || null,
    profile_picture: (val) => val || null,
    created_by: (val) => val,
  };

  try {
    const {columns,values}=mapFields(data,fieldMap)
    const patientId = await patientModel.createPatient("patient", columns, values);
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

  const jsonFields = ["pre_history","treatment_history",'tooth_details'];
  const booleanFields = []; // Add boolean fields here if needed in the future

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

    if (patients && patients.length > 0) {
      patients.forEach((patient) => {
        jsonFields.forEach((field) => {
          if (patient[field] !== undefined) {
            patient[field] = helper.safeJsonParse(patient[field]);
          }
        });

        // Optional: Boolean mapping if needed
        if (booleanFields.length > 0) {
          helper.mapBooleanFields(patient, booleanFields);
        }

        // Handling date_of_birth field conversion
        if (patient.date_of_birth) {
          patient.date_of_birth = formatDateOnly(patient.date_of_birth);
        }
      });
    }

    return patients;
  } catch (error) {
    console.error(error);
    throw new CustomError("Database error while fetching patients", 404);
  }
};


// Get single patient
const getPatientByTenantIdAndPatientId = async (tenantId, patientId) => {
  try {
    const patient = await patientModel.getPatientByTenantIdAndPatientId(tenantId, patientId);
    const fieldsToDecode = [ "pre_history", "treatment_history","tooth_details"];
    return decodeJsonFields(patient, fieldsToDecode);
  } catch (error) {
    throw new CustomError("Failed to get patient: " + error.message, 404);
  }
};

// Check existence
const checkPatientExistsByTenantIdAndPatientId = async (tenantId, patientId) => {
  try {
    return await patientModel.checkPatientExistsByTenantIdAndPatientId(tenantId, patientId);
  } catch (error) {
    throw new CustomError("Failed to check patient: " + error.message, 404);
  }
};

// Update patient
const updatePatient = async (patientId, data, tenant_id) => {
  const fieldMap = {
    tenant_id: (val) => val,
    first_name: (val) => val,
    last_name: (val) => val,
    email: (val) => val || null,
    phone_number: (val) => val,
    alternate_phone_number: (val) => val || null,
    date_of_birth: (val) => val.split('T')[0] || null,
    gender: (val) => val,
    blood_group: (val) => val || null,
    address: (val) => val || null,
    city: (val) => val || null,
    state: (val) => val || null,
    country: (val) => val || null,
    pin_code: (val) => val || null,
    profession: (val) => val || null,
    referred_by: (val) => val || null,
    tooth_details:helper.safeStringify,
    smoking_status: (val) => val || null,
    alcohol_consumption: (val) => val || null,
    emergency_contact_name: (val) => val || null,
    emergency_contact_phone: (val) => val || null,
    insurance_provider: (val) => val || null,
    insurance_policy_number: (val) => val || null,
    profile_picture: (val) => val || null,
    updated_by: (val) => val,
  };
  try {
    const {columns,values}=mapFields(data,fieldMap)
    const affectedRows = await patientModel.updatePatient(patientId, columns, values, tenant_id);
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
    const affectedRows = await patientModel.deletePatientByTenantIdAndPatientId(tenantId, patientId);
    if (affectedRows === 0) {
      throw new CustomError("Patient not found.", 404);
    }

    await invalidateCacheByPattern("patients:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete patient: ${error.message}`, 404);
  }
};


const updateToothDetails = async (data,patientId,tenant_id) => {
  data=data?JSON.parse(data):null
  try {
    const affectedRows = await patientModel.updateToothDetails(data,patientId,tenant_id);
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
  updateToothDetails
};
