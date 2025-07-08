const { CustomError } = require("../middlewares/CustomeError");
const toothdetailsModel = require("../models/ToothDetailsModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");

const toothdetailsFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  dentist_id: (val) => val,
  patient_id: (val) => val,
  tooth_id: (val) => val,
  tooth_name: (val) => val,
  tooth_position: (val) => val,
  disease_type: (val) => val,
  disease_name: (val) => val,
  treatment_date: (val) => (val ? formatDateOnly(val) : 0),
  description: (val) => (val ? helper.safeStringify(val) : null),
};

const toothdetailsFieldsReverseMap = {
  toothdetails_id:(val)=>val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  dentist_id: (val) => val,
  patient_id: (val) => val,
  tooth_id: (val) => val,
  tooth_name: (val) => val,
  tooth_position: (val) => val,
  disease_type: (val) => val,
  disease_name: (val) => val,
  allocated_to: (val) => val,
  treatment_date: (val) => (val ? formatDateOnly(val) : 0),
  description: (val) => (val ? helper.safeJsonParse(val) : null),
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};

// Field mapping for toothdetailss (similar to treatment)

// Create ToothDetails
const createToothDetails = async (data) => {
  const fieldMap = {
    ...toothdetailsFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const toothdetailsId = await toothdetailsModel.createToothDetails(
      "toothdetails",
      columns,
      values
    );
    await invalidateCacheByPattern("toothdetails:*");
    return toothdetailsId;
  } catch (error) {
    console.error("Failed to create toothdetails:", error);
    throw new CustomError(
      `Failed to create toothdetails: ${error.message}`,
      404
    );
  }
};

// Get All ToothDetailss by Tenant ID with Caching
const getAllToothDetailssByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("toothdetails", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });

  try {
    const toothdetailss = await getOrSetCache(cacheKey, async () => {
      const result = await toothdetailsModel.getAllToothDetailssByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = toothdetailss.data.map((toothdetails) =>
      helper.convertDbToFrontend(toothdetails, toothdetailsFieldsReverseMap)
    );

    return { data: convertedRows, total: toothdetailss.total };
  } catch (err) {
    console.error("Database error while fetching toothdetailss:", err);
    throw new CustomError("Failed to fetch toothdetailss", 404);
  }
};
const getAllToothDetailsByTenantAndClinicAndDentistAndPatientId = async (
  tenantId,
  clinicId,
  dentistId,
  patientId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("toothdetails", "list", {
    tenant_id: tenantId,
    clinic_id:clinicId,
    dentist_id:dentistId,
    patient_id:patientId,
    page,
    limit,
  });

  try {
    const toothdetailss = await getOrSetCache(cacheKey, async () => {
      const result =
        await toothdetailsModel.getAllToothDetailsByTenantAndClinicAndDentistAndPatientId(
          tenantId,
          clinicId,
          dentistId,
          patientId,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = toothdetailss.data.map((toothdetails) =>
      helper.convertDbToFrontend(toothdetails, toothdetailsFieldsReverseMap)
    );

    return { data: convertedRows, total: toothdetailss.total };
  } catch (err) {
    console.error("Database error while fetching toothdetailss:", err);
    throw new CustomError("Failed to fetch toothdetailss", 404);
  }
};

const getAllToothDetailsByTenantAndClinicAndPatientId = async (
  tenantId,
  clinicId,
  patientId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("toothdetails", "list", {
    tenant_id: tenantId,
    clinic_id:clinicId,
    patient_id:patientId,
    page,
    limit,
  });

  try {
    const toothdetailss = await getOrSetCache(cacheKey, async () => {
      const result =
        await toothdetailsModel.getAllToothDetailsByTenantAndClinicAndPatientId(
          tenantId,
          clinicId,
          patientId,
          Number(limit),
          offset
        );
      return result;
    });

    console.log(toothdetailss)

    const convertedRows = toothdetailss.data.map((r) => ({
      ...r,
      description: helper.safeJsonParse(r.description),
    }));

    return { data: convertedRows, total: toothdetailss.total };
  } catch (err) {
    console.error("Database error while fetching toothdetailss:", err);
    throw new CustomError("Failed to fetch toothdetailss", 404);
  }
};

// Get ToothDetails by ID & Tenant
const getToothDetailsByTenantIdAndToothDetailsId = async (
  tenantId,
  toothdetailsId
) => {
  try {
    const toothdetails =
      await toothdetailsModel.getToothDetailsByTenantAndToothDetailsId(
        tenantId,
        toothdetailsId
      );
    const convertedRows = helper.convertDbToFrontend(
      toothdetails,
      toothdetailsFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get toothdetails: " + error.message, 404);
  }
};

// Update ToothDetails
const updateToothDetails = async (toothdetailsId, data, tenant_id) => {
  const fieldMap = {
    ...toothdetailsFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);

    const affectedRows = await toothdetailsModel.updateToothDetails(
      toothdetailsId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("ToothDetails not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("toothdetails:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update toothdetails", 404);
  }
};

// Delete ToothDetails
const deleteToothDetailsByTenantIdAndToothDetailsId = async (
  tenantId,
  toothdetailsId
) => {
  try {
    const affectedRows =
      await toothdetailsModel.deleteToothDetailsByTenantAndToothDetailsId(
        tenantId,
        toothdetailsId
      );
    if (affectedRows === 0) {
      throw new CustomError("ToothDetails not found.", 404);
    }

    await invalidateCacheByPattern("toothdetails:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete toothdetails: ${error.message}`,
      404
    );
  }
};

module.exports = {
  createToothDetails,
  getAllToothDetailssByTenantId,
  getToothDetailsByTenantIdAndToothDetailsId,
  updateToothDetails,
  deleteToothDetailsByTenantIdAndToothDetailsId,
  getAllToothDetailsByTenantAndClinicAndDentistAndPatientId,
  getAllToothDetailsByTenantAndClinicAndPatientId,
};
