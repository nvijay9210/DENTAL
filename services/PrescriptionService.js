const { CustomError } = require("../middlewares/CustomeError");
const prescriptionModel = require("../models/PrescriptionModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");

// Field mapping for prescriptions (similar to treatment)

const prescriptionFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  patient_id: (val) => val,
  dentist_id: (val) => val,
  treatment_id: (val) => val,
  medication: helper.safeStringify,
  generic_name: (val) => val || null,
  brand_name: (val) => val || null,
  dosage: val=>parseInt(val),
  frequency: (val) => val || null,
  quantity: (val) => val || null,
  refill_allowed: helper.parseBoolean,
  refill_count: (val) => val || 0,
  side_effects: helper.safeStringify,
  start_date: (val) => val || null,
  end_date: (val) => val || null,
  instructions: helper.safeStringify,
  notes: helper.safeStringify,
  is_active: helper.parseBoolean,
};
const prescriptionFieldsReversMap = {
  prescription_id:val=>val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  patient_id: (val) => val,
  dentist_id: (val) => val,
  treatment_id: (val) => val,
  medication: helper.safeJsonParse,
  generic_name: (val) => val || null,
  brand_name: (val) => val || null,
  dosage: val=>val,
  frequency: (val) => val || null,
  quantity: (val) => val || null,
  refill_allowed: val => Boolean(val),
  refill_count: (val) => val || 0,
  side_effects: helper.safeJsonParse,
  start_date: (val) => val ? formatDateOnly(val) : null,
  end_date: (val) => val ? formatDateOnly(val) : null,
  instructions: helper.safeJsonParse,
  notes: helper.safeJsonParse,
  is_active: val => Boolean(val),
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null)
};

// Create Prescription
const createPrescription = async (data) => {
  const create = {
    ...prescriptionFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, create);
    const prescriptionId = await prescriptionModel.createPrescription(
      "prescription",
      columns,
      values
    );
    await invalidateCacheByPattern("prescription:*");
    await invalidateCacheByPattern("prescriptionByPatientId:*");
    return prescriptionId;
  } catch (error) {
    console.error("Failed to create prescription:", error);
    throw new CustomError(
      `Failed to create prescription: ${error.message}`,
      404
    );
  }
};

// Get All Prescriptions by Tenant ID with Caching
const getAllPrescriptionsByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `prescription:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const prescriptions = await getOrSetCache(cacheKey, async () => {
      const result = await prescriptionModel.getAllPrescriptionsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

     const convertedRows = prescriptions.data.map((prescription) =>
          helper.convertDbToFrontend(prescription, prescriptionFieldsReversMap)
        );
    
        return {data:convertedRows,total:prescriptions.total};;
  } catch (err) {
    console.error("Database error while fetching prescriptions:", err);
    throw new CustomError("Failed to fetch prescriptions", 404);
  }
};

const getAllPrescriptionsByTenantAndClinicIdAndTreatmentId = async (
  tenantId,
  clinic_id,
  treatment_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `prescriptionByPatientId:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const prescriptions = await getOrSetCache(cacheKey, async () => {
      const result =
        await prescriptionModel.getAllPrescriptionsByTenantAndClinicIdAndTreatmentId(
          tenantId,
          clinic_id,
          treatment_id,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = prescriptions.data.map((prescription) =>
          helper.convertDbToFrontend(prescription, prescriptionFieldsReversMap)
        );
    
        return {data:convertedRows,total:prescriptions.total};;
  } catch (err) {
    console.error("Database error while fetching prescriptions:", err);
    throw new CustomError("Failed to fetch prescriptions", 404);
  }
};

const getAllPrescriptionsByTenantAndClinicIdAndPatientIdAndTreatmentId = async (
  tenantId,
  clinic_id,
  dentist_id,
  treatment_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `prescriptionByPatientId:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const prescriptions = await getOrSetCache(cacheKey, async () => {
      const result =
        await prescriptionModel.getAllPrescriptionsByTenantAndClinicIdAndPatientIdAndTreatmentId(
          tenantId,
          clinic_id,
          dentist_id,
          treatment_id,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = prescriptions.data.map((prescription) =>
          helper.convertDbToFrontend(prescription, prescriptionFieldsReversMap)
        );
    
        return {data:convertedRows,total:prescriptions.total};;
  } catch (err) {
    console.error("Database error while fetching prescriptions:", err);
    throw new CustomError("Failed to fetch prescriptions", 404);
  }
};
const getAllPrescriptionsByTenantIdAndDentistId = async (
  tenantId,
  dentist_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `prescription:prescriptionByDentist:${tenantId}:dentist:${dentist_id}:page:${page}:limit:${limit}`;

  try {
    const prescriptions = await getOrSetCache(cacheKey, async () => {
      const result =
        await prescriptionModel.getAllPrescriptionsByTenantIdAndDentistId(
          tenantId,
          dentist_id,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = prescriptions.data.map((prescription) =>
          helper.convertDbToFrontend(prescription, prescriptionFieldsReversMap)
        );
    
        return {data:convertedRows,total:prescriptions.total};;
  } catch (err) {
    console.error("Database error while fetching prescriptions:", err);
    throw new CustomError("Failed to fetch prescriptions", 404);
  }
};
const getAllPrescriptionsByTenantIdAndPatientId = async (
  tenantId,
  patient_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `prescription:prescriptionByDentist:${tenantId}:patient:${patient_id}:page:${page}:limit:${limit}`;

  try {
    const prescriptions = await getOrSetCache(cacheKey, async () => {
      const result =
        await prescriptionModel.getAllPrescriptionsByTenantIdAndPatientId(
          tenantId,
          patient_id,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = prescriptions.data.map((prescription) =>
          helper.convertDbToFrontend(prescription, prescriptionFieldsReversMap)
        );
    
        return {data:convertedRows,total:prescriptions.total};;
  } catch (err) {
    console.error("Database error while fetching prescriptions:", err);
    throw new CustomError("Failed to fetch prescriptions", 404);
  }
};

// Get Prescription by ID & Tenant
const getPrescriptionByTenantIdAndPrescriptionId = async (
  tenantId,
  prescriptionId
) => {
  try {
    const prescription =
      await prescriptionModel.getPrescriptionByTenantAndPrescriptionId(
        tenantId,
        prescriptionId
      );

    const convertedRows =
      helper.convertDbToFrontend(prescription, prescriptionFieldsReversMap)

    return convertedRows
    
  } catch (error) {
    throw new CustomError("Failed to get prescription: " + error.message, 404);
  }
};

// Update Prescription
const updatePrescription = async (prescriptionId, data, tenant_id) => {
  const update = {
    ...prescriptionFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, update);
    const affectedRows = await prescriptionModel.updatePrescription(
      prescriptionId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Prescription not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("prescription:*");
    await invalidateCacheByPattern("prescriptionByPatientId:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update prescription", 404);
  }
};

// Delete Prescription
const deletePrescriptionByTenantIdAndPrescriptionId = async (
  tenantId,
  prescriptionId
) => {
  try {
    const affectedRows =
      await prescriptionModel.deletePrescriptionByTenantAndPrescriptionId(
        tenantId,
        prescriptionId
      );
    if (affectedRows === 0) {
      throw new CustomError("Prescription not found.", 404);
    }

    await invalidateCacheByPattern("prescription:*");
    await invalidateCacheByPattern("prescriptionByPatientId:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete prescription: ${error.message}`,
      404
    );
  }
};

module.exports = {
  createPrescription,
  getAllPrescriptionsByTenantId,
  getPrescriptionByTenantIdAndPrescriptionId,
  updatePrescription,
  deletePrescriptionByTenantIdAndPrescriptionId,
  getAllPrescriptionsByTenantAndClinicIdAndTreatmentId,
  getAllPrescriptionsByTenantAndClinicIdAndPatientIdAndTreatmentId,
  getAllPrescriptionsByTenantIdAndDentistId,
  getAllPrescriptionsByTenantIdAndPatientId
};
