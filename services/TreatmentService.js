const { CustomError } = require("../middlewares/CustomeError");
const treatmentModel = require("../models/TreatmentModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const { formatDateOnly } = require("../utils/DateUtils");

const treatmentFields = {
  tenant_id: (val) => val,
  patient_id: (val) => val,
  appointment_id: (val) => val,
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
  treatment_images: helper.safeStringify,
  notes: helper.safeStringify,
};

const treatmentFieldsReverseMap = {
  treatment_id: (val) => val,
  tenant_id: (val) => val,
  appointment_id: (val) => val,
  patient_id: (val) => val,
  dentist_id: (val) => val,
  clinic_id: (val) => val,
  diagnosis: helper.safeJsonParse,
  treatment_procedure: (val) => val,
  treatment_type: (val) => val,
  treatment_status: (val) => val,
  treatment_date: (val) => formatDateOnly(val),
  cost: (val) => val,
  duration: (val) => val,
  teeth_involved: (val) => val,
  complications: helper.safeJsonParse,
  follow_up_required: (val) => Boolean(val),
  follow_up_date: (val) => formatDateOnly(val),
  follow_up_notes: helper.safeJsonParse,
  anesthesia_used: (val) => Boolean(val),
  anesthesia_type: (val) => val,
  technician_assisted: (val) => val,
  treatment_images: (val) => helper.safeJsonParse(val),
  notes: helper.safeJsonParse,
  created_by: (val) => val,
  created_time: (val) => (val ? new Date(val).toISOString() : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? new Date(val).toISOString() : null),
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

  try {
    const treatments = await getOrSetCache(cacheKey, async () => {
      const result = await treatmentModel.getAllTreatmentsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = treatments.data.map((treatment) =>
      helper.convertDbToFrontend(treatment, treatmentFieldsReverseMap)
    );

    return {data:convertedRows,total:treatments.total};;
  } catch (err) {
    console.error("Database error while fetching treatments:", err);
    throw new CustomError("Failed to fetch treatments", 404);
  }
};

function flattenTreatmentImages(treatment) {
  const flattened = {};

  if (Array.isArray(treatment.treatment_images)) {
    treatment.treatment_images.forEach((item, index) => {
      flattened[`treatment_images${index}`] = item || "";
    });
  }

  delete treatment.treatment_images;

  return {
    ...treatment,
    ...flattened,
  };
}

const getAllTreatmentsByTenantAndClinicId = async (
  tenantId,
  clinic_id,
  appointment_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `treatment_patient:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const treatments = await getOrSetCache(cacheKey, async () => {
      const result = await treatmentModel.getAllTreatmentsByTenantAndClinicId(
        tenantId,
        clinic_id,
        appointment_id,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = treatments
      .data.map((treatment) =>
        helper.convertDbToFrontend(treatment, treatmentFieldsReverseMap)
      )
      .map(flattenTreatmentImages);

    return {data:convertedRows,total:treatments.total};;
  } catch (err) {
    console.error("Database error while fetching treatments:", err);
    throw new CustomError("Failed to fetch treatments", 404);
  }
};

const getAllTreatmentsByTenantAndClinicIdAndDentist = async (
  tenantId,
  clinic_id,
  dentist_id,
  appointment_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `treatment_patient:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const treatments = await getOrSetCache(cacheKey, async () => {
      const result = await treatmentModel.getAllTreatmentsByTenantAndClinicIdAndDentist(
        tenantId,
        clinic_id,
        dentist_id,
        appointment_id,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = treatments
      .data.map((treatment) =>
        helper.convertDbToFrontend(treatment, treatmentFieldsReverseMap)
      )
      .map(flattenTreatmentImages);

    return {data:convertedRows,total:treatments.total};;
  } catch (err) {
    console.error("Database error while fetching treatments:", err);
    throw new CustomError("Failed to fetch treatments", 404);
  }
};

// Get Treatment by ID & Tenant
const getTreatmentByTenantIdAndTreatmentId = async (tenantId, treatmentId) => {
  try {
    const treatment = await treatmentModel.getTreatmentByTenantAndTreatmentId(
      tenantId,
      treatmentId
    );
    const convertedRows = helper.convertDbToFrontend(
      treatment,
      treatmentFieldsReverseMap
    );
    flattenTreatmentImages(treatment);
    return { ...convertedRows, flattenTreatmentImages };
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
  getAllTreatmentsByTenantAndClinicId,
  getAllTreatmentsByTenantAndClinicIdAndDentist,
};
