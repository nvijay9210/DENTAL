const express = require("express");
const router = express.Router();
const multer = require("multer");

const notificationController = require("../controllers/NotificationController");
const {
  ADD_NOTIFICATION,
  GETALL_NOTIFICATION_TENANT,
  GET_NOTIFICATION_TENANT,
  UPDATE_NOTIFICATION_TENANT,
  DELETE_NOTIFICATION_TENANT,
  UPDATE_NOTIFICATION_RECIPIENTS_STATUS_TENANT,
  GET_NOTIFICATION_TENANT_RECEIVER,
} = require("./RouterPath");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");
const notificationvalidation = require("../validations/NotificationValidation");
const { uploadFileMiddleware } = require("../utils/UploadFiles");
// Setup multer memory storage once
const upload = multer({ storage: multer.memoryStorage() });

const notificationFileMiddleware = uploadFileMiddleware({
  folderName: "Notification",
  fileFields: [
    {
      fieldName: "file_url",
      maxSizeMB: 5,
      multiple: true,
      isDocument: false,
    },
  ],
  createValidationFn: notificationvalidation.createNotificationValidation,
  updateValidationFn: notificationvalidation.updateNotificationValidation,
});

// Create Notification
router.post(
  ADD_NOTIFICATION,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist"]),
  upload.any(),
  notificationFileMiddleware,
  notificationController.createNotification
);

// Get All Notifications by Tenant ID with Pagination
router.get(
  GETALL_NOTIFICATION_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist"]),
  notificationController.getAllNotificationsByTenantId
);
router.get(
  GET_NOTIFICATION_TENANT_RECEIVER,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist","patient","receptionist"]),
  notificationController.getNotificationsForReceiver
);

// Get Single Notification by Tenant ID & Notification ID
router.get(
  GET_NOTIFICATION_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist"]),
  notificationController.getNotificationByTenantIdAndNotificationId
);

// Update Notification
router.put(
  UPDATE_NOTIFICATION_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist"]),
  upload.any(),
  notificationFileMiddleware,
  notificationController.updateNotification
);

router.put(
  UPDATE_NOTIFICATION_RECIPIENTS_STATUS_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist","patient"]),
  notificationController.markNotificationAsRead
);

// Delete Notification
router.delete(
  DELETE_NOTIFICATION_TENANT,
  authenticateTenantClinicGroup(["tenant", "super-user", "dentist"]),
  notificationController.deleteNotificationByTenantIdAndNotificationId
);

module.exports = router;
