const { CustomError } = require("../middlewares/CustomeError");
const prescriptionModel = require("../models/PrescriptionModel");
const { redisClient, getOrSetCache, invalidateCacheByTenant } = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");

const { formatDateOnly, formatTimeOnly, formatAppointments } = require("../utils/DateUtils");

// Field mapping for prescriptions (similar to treatment)
const fieldMap = {
    tenant_id:(val)=>val,
  patient_id: (val) => val,
  dentist_id: (val) => val,
  treatment_id: (val) => val,
  medication: (val) => val || null,
  generic_name: (val) => val || null,
  brand_name: (val) => val || null,
  dosage: (val) => val || null,
  frequency: (val) => val || null,
  quantity: (val) => val || null,
  refill_allowed: (val) => val ?? false,
  refill_count: (val) => val || 0,
  side_effects: (val) => val || null,
  start_date: (val) => val || null,
  end_date: (val) => val || null,
  instructions: (val) => val || null,
  notes: (val) => val || null,
  is_active: (val) => val ?? true,
  created_by: (val) => val
};

// Create Prescription
const createPrescription = async (data) => {
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const prescriptionId = await prescriptionModel.createPrescription("prescription", columns, values);
    await invalidateCacheByTenant("prescription", data.tenant_id);
    return prescriptionId;
  } catch (error) {
    console.error("Failed to create prescription:", error);
    throw new CustomError(`Failed to create prescription: ${error.message}`, 500);
  }
};

// Get All Prescriptions by Tenant ID with Caching
const getAllPrescriptionsByTenantId = async (tenantId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const cacheKey = `prescription:${tenantId}:page:${page}:limit:${limit}`;
  const fieldsToDecode = ["medication", "side_effects", "instructions", "notes"];

  try {
    const prescriptions = await getOrSetCache(cacheKey, async () => {
      const result = await prescriptionModel.getAllPrescriptionsByTenantId(tenantId, Number(limit), offset);
      return decodeJsonFields(result, fieldsToDecode);
    });

    return prescriptions;
  } catch (error) {
    console.error("Database error while fetching prescriptions:", error);
    throw new CustomError("Failed to fetch prescriptions", 500);
  }
};

// Get Prescription by ID & Tenant
const getPrescriptionByTenantIdAndPrescriptionId = async (tenantId, prescriptionId) => {
  try {
    const prescription = await prescriptionModel.getPrescriptionByTenantIdAndPrescriptionId(
      tenantId,
      prescriptionId
    );
    const fieldsToDecode = ["medication", "side_effects", "instructions", "notes"];
    return decodeJsonFields(prescription, fieldsToDecode);
  } catch (error) {
    throw new CustomError("Failed to get prescription: " + error.message, 500);
  }
};

// Update Prescription
const updatePrescription = async (prescriptionId, data, tenant_id) => {
    const fieldMap = {
        patient_id: (val) => val,
        dentist_id: (val) => val,
        treatment_id: (val) => val,
        medication: (val) => val || null,
        generic_name: (val) => val || null,
        brand_name: (val) => val || null,
        dosage: (val) => val || null,
        frequency: (val) => val || null,
        quantity: (val) => val || null,
        refill_allowed: (val) => val ?? false,
        refill_count: (val) => val || 0,
        side_effects: (val) => val || null,
        start_date: (val) => formatDateOnly(val) || null,
        end_date: (val) => formatDateOnly(val) || null,
        instructions: (val) => val || null,
        notes: (val) => val || null,
        is_active: (val) => val ?? true,
        updated_by: (val) => val
      };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await prescriptionModel.updatePrescription(
      prescriptionId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Prescription not found or no changes made.", 404);
    }

    await invalidateCacheByTenant("prescription", tenant_id);
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update prescription", 500);
  }
};

// Delete Prescription
const deletePrescriptionByTenantIdAndPrescriptionId = async (tenantId, prescriptionId) => {
  try {
    const affectedRows = await prescriptionModel.deletePrescriptionByTenantAndPrescriptionId(
      tenantId,
      prescriptionId
    );
    if (affectedRows === 0) {
      throw new CustomError("Prescription not found.", 404);
    }

    await invalidateCacheByTenant("prescription", tenantId);
    return affectedRows;
  } catch (error) {
    throw new CustomError(`Failed to delete prescription: ${error.message}`, 500);
  }
};

module.exports = {
  createPrescription,
  getAllPrescriptionsByTenantId,
  getPrescriptionByTenantIdAndPrescriptionId,
  updatePrescription,
  deletePrescriptionByTenantIdAndPrescriptionId,
};