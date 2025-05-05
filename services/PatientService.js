const { CustomError } = require("../middlewares/CustomeError");
const patientModel = require("../models/PatientModel");
const {
  redisClient,
  invalidateCacheByTenant,
  getOrSetCache,
} = require("../config/redisConfig");
const { decodeJsonFields, getJsonValue } = require("../utils/Helpers");
const { formatDateOnly } = require("../utils/DateUtils");
const { mapFields } = require("../query/Records");

// Create patient
const createPatient = async (data) => {
  // const columns = [
  //   "tenant_id",
  //   "first_name",
  //   "last_name",
  //   "email",
  //   "phone_number",
  //   "alternate_phone_number",
  //   "date_of_birth",
  //   "gender",
  //   "blood_group",
  //   "address",
  //   "city",
  //   "state",
  //   "country",
  //   "pin_code",
  //   "smoking_status",
  //   "alcohol_consumption",
  //   "emergency_contact_name",
  //   "emergency_contact_phone",
  //   "insurance_provider",
  //   "insurance_policy_number",
  //   "profile_picture",
  //   "created_by",
  // ];

  // const values = [
  //   data.tenant_id,
  //   data.first_name,
  //   data.last_name,
  //   data.email || null,
  //   data.phone_number,
  //   data.alternate_phone_number || null,
  //   data.date_of_birth || null,
  //   data.gender,
  //   data.blood_group || null,
  //   data.address || null,
  //   data.city || null,
  //   data.state || null,
  //   data.country || null,
  //   data.pin_code || null,
  //   data.smoking_status,
  //   data.alcohol_consumption,
  //   data.emergency_contact_name,
  //   data.emergency_contact_phone,
  //   data.insurance_provider || null,
  //   data.insurance_policy_number || null,
  //   data.profile_picture || null,
  //   data.created_by,
  // ];
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
    smoking_status: (val) => val || null,
    alcohol_consumption: (val) => val || null,
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
    await invalidateCacheByTenant("patient", data.tenant_id);
    return patientId;
  } catch (error) {
    console.trace(error);
    throw new CustomError(`Failed to create patient: ${error.message}`, 500);
  }
};

// Get all patients with cache
const getAllPatientsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `patients:${tenantId}:page:${page}:limit:${limit}`;
  const fieldsToDecode = ["emergency_contact", "medical_history", "allergies"];

  try {
    const patients = await getOrSetCache(cacheKey, async () => {
      const result = await patientModel.getAllPatientsByTenantId(tenantId, Number(limit), offset);
      return decodeJsonFields(result, fieldsToDecode);
    });
    return patients;
  } catch (error) {
    console.error(error);
    throw new CustomError("Database error while fetching patients", 500);
  }
};

// Get single patient
const getPatientByTenantIdAndPatientId = async (tenantId, patientId) => {
  try {
    const patient = await patientModel.getPatientByTenantIdAndPatientId(tenantId, patientId);
    const fieldsToDecode = ["emergency_contact", "medical_history", "allergies"];
    return decodeJsonFields(patient, fieldsToDecode);
  } catch (error) {
    throw new CustomError("Failed to get patient: " + error.message, 500);
  }
};

// Check existence
const checkPatientExistsByTenantIdAndPatientId = async (tenantId, patientId) => {
  try {
    return await patientModel.checkPatientExistsByTenantIdAndPatientId(tenantId, patientId);
  } catch (error) {
    throw new CustomError("Failed to check patient: " + error.message, 500);
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
    // const columns = [
    //   "first_name",
    //   "last_name",
    //   "gender",
    //   "date_of_birth",
    //   "email",
    //   "phone_number",
    //   "alternate_phone_number",
    //   "address",
    //   "city",
    //   "state",
    //   "country",
    //   "pin_code",
    //   "emergency_contact_phone",
    //   "medical_history",
    //   "blood_group",
    //   "insurance_provider",
    //   "insurance_policy_number",
    //   "profile_picture",
    //   "updated_by"
    // ];

    // const values = [
    //   data.first_name,
    //   data.last_name,
    //   data.gender,
    //   formatDateOnly(data.date_of_birth || null),
    //   data.email || null,
    //   data.phone_number,
    //   data.alternate_phone_number || null,
    //   data.address || null,
    //   data.city || null,
    //   data.state || null,
    //   data.country || null,
    //   data.pin_code || null,
    //   getJsonValue(data.emergency_contact_phone),
    //   getJsonValue(data.medical_history),
    //   data.blood_group || null,
    //   data.insurance_provider || null,
    //   data.insurance_policy_number || null,
    //   data.profile_picture || null,
    //   data.updated_by
    // ];
    const {columns,values}=mapFields(data,fieldMap)
    const affectedRows = await patientModel.updatePatient(patientId, columns, values, tenant_id);
    if (affectedRows === 0) {
      throw new CustomError("Patient not found or no changes made.", 404);
    }

    await invalidateCacheByTenant("patient", tenant_id);
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update patient", 500);
  }
};

// Delete patient
const deletePatientByTenantIdAndPatientId = async (tenantId, patientId) => {
  try {
    const affectedRows = await patientModel.deletePatientByTenantIdAndPatientId(tenantId, patientId);
    if (affectedRows === 0) {
      throw new CustomError("Patient not found.", 404);
    }

    await invalidateCacheByTenant("patient", tenantId);
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete patient: ${error.message}`, 500);
  }
};

module.exports = {
  createPatient,
  getAllPatientsByTenantId,
  getPatientByTenantIdAndPatientId,
  checkPatientExistsByTenantIdAndPatientId,
  updatePatient,
  deletePatientByTenantIdAndPatientId,
};
