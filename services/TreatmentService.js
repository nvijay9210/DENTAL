const { CustomError } = require("../middlewares/CustomeError");
const treatmentModel = require("../models/TreatmentModel");
const { redisClient, getOrSetCache, invalidateCacheByTenant } = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");

// Create Treatment
const createTreatment = async (data) => {
    const fieldMap = {
        tenant_id: (val) => val,
        patient_id: (val) => val,
        dentist_id: (val) => val,
        clinic_id: (val) => val,
        diagnosis: (val) => val || null,
        treatment_procedure: (val) => val || null,
        treatment_type: (val) => val.toLowerCase() || null,
        treatment_status: (val) => val || null,
        treatment_date: (val) => val,
        cost: (val) => val || 0,
        duration: (val) => val || null,
        teeth_involved: (val) => val || null,
        complications: (val) => val || null,
        follow_up_required: (val) => val || false,
        follow_up_date: (val) => val || null,
        follow_up_notes: (val) => val || null,
        anesthesia_used: (val) => val || false,
        anesthesia_type: (val) => val || null,
        technician_assisted: (val) => val || null,
        images: (val) => val || null,
        notes: (val) => val || null,
        created_by: (val) => val
      };
      

  try {
    const { columns, values } = mapFields(data, fieldMap);
    const treatmentId = await treatmentModel.createTreatment("treatment", columns, values);
    await invalidateCacheByTenant("treatment", data.tenant_id);
    return treatmentId;
  } catch (error) {
    console.error("Failed to create treatment:", error);
    throw new CustomError(`Failed to create treatment: ${error.message}`, 500);
  }
};

// Get All Treatments by Tenant ID with Caching
const getAllTreatmentsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `treatment:${tenantId}:page:${page}:limit:${limit}`;
  const fieldsToDecode = ["description", "diagnosis", "notes"];

  try {
    const treatments = await getOrSetCache(cacheKey, async () => {
      const result = await treatmentModel.getAllTreatmentsByTenantId(tenantId, Number(limit), offset);
      return decodeJsonFields(result, fieldsToDecode);
    });

    return treatments;
  } catch (error) {
    console.error("Database error while fetching treatments:", error);
    throw new CustomError("Failed to fetch treatments", 500);
  }
};

// Get Treatment by ID & Tenant
const getTreatmentByTenantIdAndTreatmentId = async (tenantId, treatmentId) => {
  try {
    const treatment = await treatmentModel.getTreatmentByTenantIdAndTreatmentId(tenantId, treatmentId);
    const fieldsToDecode = ["description", "diagnosis", "notes"];
    return decodeJsonFields(treatment, fieldsToDecode);
  } catch (error) {
    throw new CustomError("Failed to get treatment: " + error.message, 500);
  }
};

// Update Treatment
const updateTreatment = async (treatmentId, data, tenant_id) => {
    const fieldMap = {
        tenant_id: (val) => val,
        patient_id: (val) => val,
        dentist_id: (val) => val,
        clinic_id: (val) => val,
        diagnosis: (val) => val || null,
        treatment_procedure: (val) => val || null,
        treatment_type: (val) => val || null,
        treatment_status: (val) => val || null,
        treatment_date: (val) => val,
        cost: (val) => val || 0,
        duration: (val) => val || null,
        teeth_involved: (val) => val || null,
        complications: (val) => val || null,
        follow_up_required: (val) => val || false,
        follow_up_date: (val) => val || null,
        follow_up_notes: (val) => val || null,
        anesthesia_used: (val) => val || false,
        anesthesia_type: (val) => val || null,
        technician_assisted: (val) => val || null,
        images: (val) => val || null,
        notes: (val) => val || null,
        updated_by: (val) => val
      };

  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await treatmentModel.updateTreatment(treatmentId, columns, values, tenant_id);

    if (affectedRows === 0) {
      throw new CustomError("Treatment not found or no changes made.", 404);
    }

    await invalidateCacheByTenant("treatment", tenant_id);
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update treatment", 500);
  }
};

// Delete Treatment
const deleteTreatmentByTenantIdAndTreatmentId = async (tenantId, treatmentId) => {
  try {
    const affectedRows = await treatmentModel.deleteTreatmentByTenantAndTreatmentId(tenantId, treatmentId);
    if (affectedRows === 0) {
      throw new CustomError("Treatment not found.", 404);
    }

    await invalidateCacheByTenant("treatment", tenantId);
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete treatment: ${error.message}`, 500);
  }
};

module.exports = {
  createTreatment,
  getAllTreatmentsByTenantId,
  getTreatmentByTenantIdAndTreatmentId,
  updateTreatment,
  deleteTreatmentByTenantIdAndTreatmentId,
};
