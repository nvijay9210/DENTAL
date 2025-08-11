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
const { buildCacheKey } = require("../utils/RedisCache");
const {
  saveDocuments,
  updateDocumentsDiffBased,
} = require("../utils/UploadFiles");
const { getDocumentsByField, deleteDocumentsByTableAndId } = require("../models/documentModel");

// Field mapping for notifications (similar to treatment)

const notificationFields = {
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  sender_role: (val) => val,
  sender_id: (val) => val,
  type: (val) => val,
  title: (val) => val,
  message: (val) => helper.safeStringify(val),
  reference_id: (val) => (val ? parseInt(val) : null),
  file_url: (val) => val,
};
const notificationFieldsReverseMap = {
  notification_id: (val) => val,
  tenant_id: (val) => val,
  clinic_id: (val) => val,
  sender_role: (val) => val,
  sender_id: (val) => val,
  type: (val) => val,
  title: (val) => val,
  message: (val) => helper.safeJsonParse(val),
  reference_id: (val) => (val ? parseInt(val) : null),
  file_url: (val) => val,
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

    await saveDocuments({
      table_name: "notifications",
      table_id: notification_id,
      field_name: "file_url",
      files: data.file_url,
      created_by: data.created_by,
    });

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
  const cacheKey = buildCacheKey("notification", "list", {
    tenant_id: tenantId,
    page,
    limit,
  });

  try {
    const notifications = await getOrSetCache(cacheKey, async () => {
      const result = await notificationModel.getAllNotificationsByTenantId(
        tenantId,
        Number(limit),
        offset
      );
      return result;
    });

    const convertedRows = await Promise.all(
      notifications.data.map(async (notification) => {
        const formatted = helper.convertDbToFrontend(
          notification,
          notificationFieldsReverseMap
        );

        const docs = await getDocumentsByField(
          "notifications",
          notification.notification_id,
          "file_url"
        );

        // Extract only file_url
        const fileInfos = docs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          file_url: fileInfos,
        };
      })
    );

    return { data: convertedRows, total: notifications.total };
  } catch (err) {
    console.error("Database error while fetching notifications:", err);
    throw new CustomError(err, 500);
  }
};

const getNotificationsForReceiver = async (
  tenantId,
  clinicId,
  receiverId,
  receiverRole
) => {
  const cacheKey = `notification:${tenantId}`;

  try {
    let notifications = await getOrSetCache(cacheKey, async () => {
      const result = await notificationModel.getNotificationsForReceiver(
        tenantId,
        receiverId,
        receiverRole,
        clinicId
      );
      return result;
    });

    const convertedRows = await Promise.all(
      notifications.map(async (notification) => {
        const formatted = {
          ...notification,
          message: helper.safeJsonParse(notification.message),
        };

        const docs = await getDocumentsByField(
          "notifications",
          notification.notification_id,
          "file_url"
        );

        // Extract only file_url
        const fileInfos = docs.map((doc) => ({
          document_id: doc.document_id,
          file_url: doc.file_url,
        }));

        return {
          ...formatted,
          file_url: fileInfos,
        };
      })
    );

    return convertedRows;
  } catch (err) {
    console.error("Database error while fetching notifications:", err);
    throw new CustomError(err, 500);
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

    const docs = await getDocumentsByField(
      "notifications",
      notification.notification_id,
      "file_url"
    );

    const fileInfos = docs.map((doc) => ({
      document_id: doc.document_id,
      file_url: doc.file_url,
    }));

    return {
      ...formatted,
      file_url: fileInfos,
    };
  } catch (error) {
    throw new CustomError(err, 500);
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

    const file_url = data.file_url || req?.body?.file_url || [];

    await updateDocumentsDiffBased({
      table_name: "notifications",
      table_id: notification_id,
      field_name: "file_url",
      newFiles: file_url,
      deletedFileIds: data.deletedFileIds,
      updated_by: data.updated_by,
    });

    await invalidateCacheByPattern("notification:*");
    return affectedRows;
  } catch (error) {
    console.error("Update Error:", error);
    throw new CustomError(err, 500);
  }
};

// Delete Notification
const deleteNotificationByTenantIdAndNotificationId = async (
  tenantId,
  notification_id
) => {
  try {
    await deleteDocumentsByTableAndId('notification',notification_id)
    const affectedRows =
      await notificationModel.deleteNotificationByTenantAndNotificationId(
        tenantId,
        notification_id
      );
    // if (affectedRows === 0) {
    //   throw new CustomError(err, 500);
    // }

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
