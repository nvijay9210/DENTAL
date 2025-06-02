const { CustomError } = require("../middlewares/CustomeError");
const reminderPingModel = require("../models/ReminderPingModel");
const {
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");
const { formatDateOnly } = require("../utils/DateUtils");

// Field mapping for reminderPings (similar to treatment)

const reminderPingFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  dentist_id: (val) => val,
  reminder_ping_description: helper.safeStringify,
  reminder_type: (val) => val,
  reminder_ping_date: (val) => (val ? formatDateOnly(val) : null),
  reminder_ping_time: (val) => val,
};

const reminderPingFieldsReverseMap = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  dentist_id: (val) => val,
  reminder_ping_description: helper.safeJsonParse,
  reminder_type: (val) => val,
  reminder_ping_date: (val) => (val ? formatDateOnly(val) : null),
  reminder_ping_time: (val) => val,
  created_by: (val) => val,
  created_time: (val) => (val ? new Date(val).toISOString() : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? new Date(val).toISOString() : null),
};

// Create ReminderPing
const createReminderPing = async (data) => {
  const fieldMap = {
    ...reminderPingFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const reminderPingId = await reminderPingModel.createReminderPing(
      "reminderPing",
      columns,
      values
    );
    await invalidateCacheByPattern("reminderPing:*");
    return reminderPingId;
  } catch (error) {
    console.error("Failed to create reminderPing:", error);
    throw new CustomError(
      `Failed to create reminderPing: ${error.message}`,
      404
    );
  }
};

// Get All ReminderPings by Tenant ID with Caching
const getAllReminderPingsByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `reminderPing:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const reminderPings = await getOrSetCache(cacheKey, async () => {
      const result = await reminderPingModel.getAllReminderPingsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = reminderPings.map((reminderPing) =>
      helper.convertDbToFrontend(reminderPing, reminderPingFieldsReverseMap)
    );

    return convertedRows;
  } catch (err) {
    console.error("Database error while fetching reminderPings:", err);
    throw new CustomError("Failed to fetch reminderPings", 404);
  }
};
const getAllReminderPingsByTenantIdAndClinicId = async (
  tenantId,
  clinic_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `reminderPing:${tenantId}:clinic:${clinic_id}:page:${page}:limit:${limit}`;

  try {
    const reminderPings = await getOrSetCache(cacheKey, async () => {
      const result = await reminderPingModel.getAllReminderPingsByTenantIdAndClinicId(
        tenantId,
        clinic_id,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = reminderPings.map((reminderPing) =>
      helper.convertDbToFrontend(reminderPing, reminderPingFieldsReverseMap)
    );

    return convertedRows;
  } catch (err) {
    console.error("Database error while fetching reminderPings:", err);
    throw new CustomError("Failed to fetch reminderPings", 404);
  }
};

const getAllReminderPingsByTenantIdAndClinicIdAndDentistId = async (
  tenantId,
  clinic_id,
  dentist_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `reminderPing:${tenantId}:dentist:${dentist_id}:page:${page}:limit:${limit}`;

  try {
    const reminderPings = await getOrSetCache(cacheKey, async () => {
      const result = await reminderPingModel.getAllReminderPingsByTenantIdAndClinicIdAndDentistId(
        tenantId,
        clinic_id,
        dentist_id,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = reminderPings.map((reminderPing) =>
      helper.convertDbToFrontend(reminderPing, reminderPingFieldsReverseMap)
    );

    return convertedRows;
  } catch (err) {
    console.error("Database error while fetching reminderPings:", err);
    throw new CustomError("Failed to fetch reminderPings", 404);
  }
};

// Get ReminderPing by ID & Tenant
const getReminderPingByTenantIdAndReminderPingId = async (
  tenantId,
  reminderPingId
) => {
  try {
    const reminderPing =
      await reminderPingModel.getReminderPingByTenantAndReminderPingId(
        tenantId,
        reminderPingId
      );
    const convertedRows = helper.convertDbToFrontend(
      reminderPing,
      reminderPingFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get reminderPing: " + error.message, 404);
  }
};

// Update ReminderPing
const updateReminderPing = async (reminderPingId, data, tenant_id) => {
  const fieldMap = {
    ...reminderPingFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await reminderPingModel.updateReminderPing(
      reminderPingId,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("ReminderPing not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("reminderPing:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update reminderPing", 404);
  }
};

// Delete ReminderPing
const deleteReminderPingByTenantIdAndReminderPingId = async (
  tenantId,
  reminderPingId
) => {
  try {
    const affectedRows =
      await reminderPingModel.deleteReminderPingByTenantAndReminderPingId(
        tenantId,
        reminderPingId
      );
    if (affectedRows === 0) {
      throw new CustomError("ReminderPing not found.", 404);
    }

    await invalidateCacheByPattern("reminderPing:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete reminderPing: ${error.message}`,
      404
    );
  }
};

module.exports = {
  createReminderPing,
  getAllReminderPingsByTenantId,
  getReminderPingByTenantIdAndReminderPingId,
  updateReminderPing,
  deleteReminderPingByTenantIdAndReminderPingId,
  getAllReminderPingsByTenantIdAndClinicIdAndDentistId,
  getAllReminderPingsByTenantIdAndClinicId
};
