const { CustomError } = require("../middlewares/CustomeError");
const notificationModel = require("../models/NotificationModel");
const {
  redisClient,
  getOrSetCache,
  invalidateCacheByPattern,
} = require("../config/redisConfig");
const { decodeJsonFields } = require("../utils/Helpers");
const { mapFields } = require("../query/Records");
const helper = require("../utils/Helpers");

const { formatDateOnly, convertUTCToLocal } = require("../utils/DateUtils");
const {
  createNotificationRecipient,
} = require("./NotificationRecipientsService");

// Field mapping for notifications (similar to treatment)

const notificationFields = {
  tenant_id: (val) => val,
  sender_role: (val) => val,
  sender_id: (val) => val,
  type: (val) => val,
  title: (val) => val,
  message: (val) => helper.safeStringify(val),
  reference_id: (val) => (val ? parseInt(val) : null),
  file_url: (val) => helper.safeStringify(val),
};
const notificationFieldsReverseMap = {
  notification_id: (val) => val,
  tenant_id: (val) => val,
  sender_role: (val) => val,
  sender_id: (val) => val,
  type: (val) => val,
  title: (val) => val,
  message: (val) => helper.safeJsonParse(val),
  reference_id: (val) => (val ? parseInt(val) : null),
  file_url: (val) => helper.safeJsonParse(val),
  created_by: (val) => val,
  created_time: (val) => (val ? convertUTCToLocal(val) : null),
  updated_by: (val) => val,
  updated_time: (val) => (val ? convertUTCToLocal(val) : null),
};
// Create Notification
const createNotification = async (data) => {
  const fieldMap = {
    ...notificationFields,
    created_by: (val) => val,
  };

  try {
    const { columns, values } = mapFields(data, fieldMap);

    // Step 1: Create the main notification
    const notification_id = await notificationModel.createNotification(
      "notifications",
      columns,
      values
    );

    if (isNaN(notification_id)) {
      throw new CustomError("Notification not created", 404);
    }

    // Step 2: Normalize receiver_id into an array
    let receiverIds = data.receiver_id;

    // If string like "[1,2,3]" or "1,2,3"
    if (typeof receiverIds === "string") {
      try {
        receiverIds = JSON.parse(receiverIds); // "[1,2,3]" → [1, 2, 3]
      } catch (err) {
        // fallback: try comma-separated format
        receiverIds = receiverIds
          .split(",")
          .map((id) => parseInt(id.trim(), 10));
      }
    }

    // Final check: wrap in array if it's just one value
    receiverIds = Array.isArray(receiverIds) ? receiverIds : [receiverIds];

    const recipientIds = [];

    console.log(receiverIds);

    // Step 3: Save one recipient at a time
    for (let receiver_id of receiverIds) {
      receiver_id = parseInt(receiver_id);

      const recipientData = {
        notification_id,
        receiver_role: data.receiver_role,
        receiver_id,
        status: data.status || "unread",
        delivered_at: data.delivered_at || new Date(),
        created_by: data.created_by,
      };

      console.log("Saving recipient for receiver_id:", receiver_id);

      const notification_recipients_id = await createNotificationRecipient(
        recipientData
      );
      recipientIds.push(notification_recipients_id);
    }

    await invalidateCacheByPattern("notification:*");

    return recipientIds;
  } catch (error) {
    console.error("Failed to create notification:", error);
    throw new CustomError(
      `Failed to create notification: ${error.message}`,
      404
    );
  }
};

// Get All Notifications by Tenant ID with Caching
const getAllNotificationsByTenantId = async (
  tenantId,
  page = 1,
  limit = 10
) => {
  const offset = (page - 1) * limit;
  const cacheKey = `notification:${tenantId}:page:${page}:limit:${limit}`;

  try {
    const notifications = await getOrSetCache(cacheKey, async () => {
      const result = await notificationModel.getAllNotificationsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = notifications.data.map((notification) =>
      helper.convertDbToFrontend(notification, notificationFieldsReverseMap)
    );

    return { data: convertedRows, total: notifications.total };
  } catch (err) {
    console.error("Database error while fetching notifications:", err);
    throw new CustomError("Failed to fetch notifications", 404);
  }
};

const getNotificationsForReceiver = async (
  tenantId,
  receiverId,
  receiverRole
) => {
  const cacheKey = `notification:${tenantId}`;

  try {
    let notifications = await getOrSetCache(cacheKey, async () => {
      const result = await notificationModel.getNotificationsForReceiver(
        tenantId,
        receiverId,
        receiverRole
      );
      return result;
    });

    // ✅ Parse message field for each item safely
    notifications = notifications.map((n) => ({
      ...n,
      message: helper.safeJsonParse(n.message),
    }));

    return notifications;
  } catch (err) {
    console.error("Database error while fetching notifications:", err);
    throw new CustomError("Failed to fetch notifications", 404);
  }
};

// Get Notification by ID & Tenant
const getNotificationByTenantIdAndNotificationId = async (
  tenantId,
  notification_id
) => {
  try {
    const notification =
      await notificationModel.getNotificationByTenantAndNotificationId(
        tenantId,
        notification_id
      );

    const convertedRows = helper.convertDbToFrontend(
      notification,
      notificationFieldsReverseMap
    );

    return convertedRows;
  } catch (error) {
    throw new CustomError("Failed to get notification: " + error.message, 404);
  }
};

// Update Notification
const updateNotification = async (notification_id, data, tenant_id) => {
  const fieldMap = {
    ...notificationFields,
    updated_by: (val) => val,
  };
  try {
    const { columns, values } = mapFields(data, fieldMap);
    const affectedRows = await notificationModel.updateNotification(
      notification_id,
      columns,
      values,
      tenant_id
    );

    if (affectedRows === 0) {
      throw new CustomError("Notification not found or no changes made.", 404);
    }

    await invalidateCacheByPattern("notification:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError("Failed to update notification", 404);
  }
};

// Delete Notification
const deleteNotificationByTenantIdAndNotificationId = async (
  tenantId,
  notification_id
) => {
  try {
    const affectedRows =
      await notificationModel.deleteNotificationByTenantAndNotificationId(
        tenantId,
        notification_id
      );
    if (affectedRows === 0) {
      throw new CustomError("Notification not found.", 404);
    }

    await invalidateCacheByPattern("notification:*");
    return affectedRows;
  } catch (error) {
    throw new CustomError(
      `Failed to delete notification: ${error.message}`,
      404
    );
  }
};

module.exports = {
  createNotification,
  getAllNotificationsByTenantId,
  getNotificationByTenantIdAndNotificationId,
  updateNotification,
  deleteNotificationByTenantIdAndNotificationId,
  getNotificationsForReceiver,
};
