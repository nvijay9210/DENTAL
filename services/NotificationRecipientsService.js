const { CustomError } = require("../middlewares/CustomeError");
const notificationRecipientModel = require("../models/NotificationRecipientsModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");
const { buildCacheKey } = require("../utils/RedisCache");

// Field mapping for notificationRecipients (similar to treatment)

const notificationRecipientFields = {
    notification_id: (val) => val,
    receiver_role: (val) => val,
    receiver_id: (val) => val,
    status: (val) => val,
    delivered_at: (val) => val,
    read_at: (val) => val
  };
const notificationRecipientFieldsReverseMap = {
  notification_recipient_id: (val) => val,
  notification_id: (val) => val,
  receiver_role: (val) => val,
  receiver_id: (val) => val,
  status: (val) => val,
  delivered_at: (val) => (val ? convertUTCToLocal(val) : null),
  read_at: (val) => (val ? convertUTCToLocal(val) : null),
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create NotificationRecipient
const createNotificationRecipient = async (data) => {
  const fieldMap = {
    ...notificationRecipientFields,
    created_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const notification_recipient_id =
      await notificationRecipientModel.createNotificationRecipient(
        "notificationRecipients",
        columns,
        values
      );
    await invalidateCacheByPattern("notificationrecipient:*");
    return notification_recipient_id;
  } catch (error) {
    console.error("Failed to create notificationRecipient:", error);
    throw new CustomError(
      `Failed to create notificationRecipient: ${error.message}`,
      404
    );
  }
};

// Get All NotificationRecipients by Tenant ID with Caching
const getAllNotificationRecipientsByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("notificationrecipient", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });

  try {
    const notificationRecipients = await getOrSetCache(cacheKey, async () => {
      const result =
        await notificationRecipientModel.getAllNotificationRecipientsByTenantId(
          tenantId,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = notificationRecipients.data.map((notificationRecipient) =>
      helper.convertDbToFrontend(
        notificationRecipient,
        notificationRecipientFieldsReverseMap
      )
    );

    return { data: convertedRows, total: notificationRecipients.total };
  } catch (err) {
    console.error("Database error while fetching notificationRecipients:", err);
    throw new CustomError("Failed to fetch notificationRecipients", 404);
  }
};
const getAllNotificationRecipientByTenantIdAndSupplierId = async (
  tenantId,
  supplier_id,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = buildCacheKey("notificationrecipient", "list", {
    tenant_id: tenantId,
    supplier_id,
    page,
    limit,
  });

  try {
    const notificationRecipients = await getOrSetCache(cacheKey, async () => {
      const result =
        await notificationRecipientModel.getAllNotificationRecipientByTenantIdAndSupplierId(
          tenantId,
          supplier_id,
          Number(limit),
          offset
        );
      return result;
    });

    const convertedRows = notificationRecipients.data.map((notificationRecipient) =>
      helper.convertDbToFrontend(
        notificationRecipient,
        notificationRecipientFieldsReverseMap
      )
    );

    return { data: convertedRows, total: notificationRecipients.total };
  } catch (err) {
    console.error("Database error while fetching notificationRecipients:", err);
    throw new CustomError("Failed to fetch notificationRecipients", 404);
  }
};

// Get NotificationRecipient by ID & Tenant
const getNotificationRecipientByTenantIdAndNotificationRecipientId = async (
  tenantId,
  notification_recipient_id
) => {
  try {
    const notificationRecipient =
      await notificationRecipientModel.getNotificationRecipientByTenantAndNotificationRecipientId(
        tenantId,
        notification_recipient_id
      );

    const convertedRows = helper.convertDbToFrontend(
      notificationRecipient,
      notificationRecipientFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError(
      "Failed to get notificationRecipient: " + error.message,
      404
    );
  }
};

// Update NotificationRecipient
const updateNotificationRecipient = async (notification_recipient_id, data, tenant_id) => {
  const fieldMap = {
    ...notificationRecipientFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await notificationRecipientModel.updateNotificationRecipient(
      notification_recipient_id,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError(
        "NotificationRecipient not found or no changes made.",
        404
      );
    }

    await invalidateCacheByPattern("notificationrecipient:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update notificationRecipient", 404);
  }
};

const markNotificationAsRead = async (notification_recipient_id) => {

  try {
    const affectedRows = await notificationRecipientModel.markNotificationAsRead(
      notification_recipient_id
    );

    if (affectedRows === false) {
      throw new CustomError(
        "NotificationRecipient not found or no changes made.",
        404
      );
    }

    await invalidateCacheByPattern("notificationrecipient:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update notificationRecipient", 404);
  }
};

// Delete NotificationRecipient
const deleteNotificationRecipientByTenantIdAndNotificationRecipientId = async (
  tenantId,
  notification_recipient_id
) => {
  try {
    const affectedRows =
      await notificationRecipientModel.deleteNotificationRecipientByTenantAndNotificationRecipientId(
        tenantId,
        notification_recipient_id
      );
    if (affectedRows === 0) {
      throw new CustomError("NotificationRecipient not found.", 404);
    }

    await invalidateCacheByPattern("notificationrecipient:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete notificationRecipient: ${error.message}`,
      404
    );
  }
};

module.exports = {
  createNotificationRecipient,
  getAllNotificationRecipientsByTenantId,
  getNotificationRecipientByTenantIdAndNotificationRecipientId,
  updateNotificationRecipient,
  deleteNotificationRecipientByTenantIdAndNotificationRecipientId,
  getAllNotificationRecipientByTenantIdAndSupplierId,
  markNotificationAsRead
};
