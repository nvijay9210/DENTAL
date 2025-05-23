const { CustomError } = require("../middlewares/CustomeError");
const treatmentModel = require("../models/TreatmentModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const { formatDateOnly } = require("../utils/DateUtils");

const treatmentFields = {
  tenant_id: (val) => val,
  patient_id: (val) => val,
  dentist_id: (val) => val,
  clinic_id: (val) => val,
  diagnosis: helper.safeStringify,
  treatment_procedure: (val) => val,
  treatment_type: (val) => val,
  treatment_status: (val) => val,
  treatment_date: (val) => val,
  cost: (val) => val || 0,
  duration: (val) => val || null,
  teeth_involved: (val) => val || null,
  complications: helper.safeStringify,
  follow_up_required: helper.parseBoolean,
  follow_up_date: (val) => val || null,
  follow_up_notes: helper.safeStringify,
  anesthesia_used: helper.parseBoolean,
  anesthesia_type: (val) => val || null,
  technician_assisted: (val) => val || null,
  treatment_images: (val) => val || null,
  notes: helper.safeStringify,
};
// Create Treatment
const createTreatment = async (data) => {
  const create = {
    ...treatmentFields,
    created_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, create);
    const treatmentId = await treatmentModel.createTreatment(
      "treatment",
      columns,
      values
    );
    await invalidateCacheByPattern("treatment:*");
    await invalidateCacheByPattern("treatment_patient:*");
    return treatmentId;
  } catch (error) {
    console.error("Failed to create treatment:", error);
    throw new CustomError(`Failed to create treatment: ${error.message}`, 404);
  }
};

// Get All Treatments by Tenant ID with Caching
const getAllTreatmentsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `treatment:${tenantId}:page:${page}:limit:${limit}`;

  const jsonFields = ["description", "diagnosis", "notes"];

  try {
    const treatments = await getOrSetCache(cacheKey, async () => {
      const result = await treatmentModel.getAllTreatmentsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    return helper.decodeJsonFields(treatments, jsonFields);
  } catch (err) {
    console.error("Database error while fetching treatments:", err);
    throw new CustomError("Failed to fetch treatments", 404);
  }
};

const getAllTreatmentsByTenantAndPatientId = async (
  tenantId,
  patientId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `treatment_patient:${tenantId}:page:${page}:limit:${limit}`;

  const jsonFields = ["description", "diagnosis", "notes"];
  const booleanFields = ["follow_up_required", "anesthesia_used"];

  try {
    const treatments = await getOrSetCache(cacheKey, async () => {
      const result = await treatmentModel.getAllTreatmentsByTenantAndPatientId(
        tenantId,
        patientId,
        Number(limit),
        offset
      );
      return result;
    });

    const parsed = helper.decodeJsonFields(treatments, jsonFields);
    parsed.forEach((p) => {
      helper.mapBooleanFields(p, booleanFields);
    });
    return parsed.map((p) => ({
      ...p,
      treatment_date: formatDateOnly(p.treatment_date),
      follow_up_date: formatDateOnly(p.follow_up_date),
    }));
  } catch (err) {
    console.error("Database error while fetching treatments:", err);
    throw new CustomError("Failed to fetch treatments", 404);
  }
};

// Get Treatment by ID & Tenant
const getTreatmentByTenantIdAndTreatmentId = async (tenantId, treatmentId) => {
  try {
    const treatment = await treatmentModel.getTreatmentByTenantIdAndTreatmentId(
      tenantId,
      treatmentId
    );
    const fieldsToDecode = ["description", "diagnosis", "notes"];
    return decodeJsonFields(treatment, fieldsToDecode);
  } catch (error) {
    throw new CustomError("Failed to get treatment: " + error.message, 404);
  }
};

// Update Treatment
const updateTreatment = async (treatmentId, data, tenant_id) => {
  const update = {
    ...treatmentFields,
    updated_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, update);
    const affectedRows = await treatmentModel.updateTreatment(
      treatmentId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Treatment not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("treatment:*");
    await invalidateCacheByPattern("treatment_patient:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update treatment", 404);
  }
};

// Delete Treatment
const deleteTreatmentByTenantIdAndTreatmentId = async (
  tenantId,
  treatmentId
) => {
  try {
    const affectedRows =
      await treatmentModel.deleteTreatmentByTenantAndTreatmentId(
        tenantId,
        treatmentId
      );
    if (affectedRows === 0) {
      throw new CustomError("Treatment not found.", 404);
    }

    await invalidateCacheByPattern("treatment:*");
    await invalidateCacheByPattern("treatment_patient:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete treatment: ${error.message}`, 404);
  }
};

module.exports = {
  createTreatment,
  getAllTreatmentsByTenantId,
  getTreatmentByTenantIdAndTreatmentId,
  updateTreatment,
  deleteTreatmentByTenantIdAndTreatmentId,
  getAllTreatmentsByTenantAndPatientId,
};
