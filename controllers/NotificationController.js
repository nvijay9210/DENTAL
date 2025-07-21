const { CustomError } = require("../middlewares/CustomeError");
const { checkIfExists, checkIfIdExists } = require("../models/checkIfExists");
const notificationService = require("../services/NotificationService");
const notificationRecipientService = require("../services/NotificationRecipientsService");
const {
  validateTenantIdAndPageAndLimit,
} = require("../validations/CommonValidations");
const notificationValidation = require("../validations/NotificationValidation");

/**
 * Create a new notification
 */
exports.createNotification = async (req, res, next) => {
  const details = req.body;

  try {
    // Validate notification data
    await notificationValidation.createNotificationValidation(details);

    // Create the notification
    const id = await notificationService.createNotification(details);
    res.status(201).json({ message: "Notification created", id });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all notifications by tenant ID with pagination
 */
exports.getAllNotificationsByTenantId = async (req, res, next) => {
  const { tenant_id } = req.params;
  const { page, limit } = req.query;
  await validateTenantIdAndPageAndLimit(tenant_id, page, limit);
  try {
    const notifications =
      await notificationService.getAllNotificationsByTenantId(
        tenant_id,
        page,
        limit
      );
    res.status(200).json(notifications);
  } catch (err) {
    next(err);
  }
};
exports.getNotificationsForReceiver = async (req, res, next) => {
  const { tenant_id,clinic_id } = req.params;
  const { receiver_role, receiver_id } = req.query;
  const roles=['super-user','patient','dentist','receptionist']
  if(!roles.includes(receiver_role)) throw new CustomError('Role not exists',400)

  await checkIfIdExists("tenant", "tenant_id", tenant_id);
  await checkIfIdExists("clinic", "clinic_id", clinic_id);
  try {
    const notifications = await notificationService.getNotificationsForReceiver(
      tenant_id,
      clinic_id,
      receiver_id,
      receiver_role
    );
    res.status(200).json(notifications);
  } catch (err) {
    next(err);
  }
};

/**
 * Get notification by tenant and notification ID
 */
exports.getNotificationByTenantIdAndNotificationId = async (req, res, next) => {
  const { notification_id, tenant_id } = req.params;

  try {
    const notification1 = await checkIfExists(
      "notifications",
      "notification_id",
      notification_id,
      tenant_id
    );

    if (!notification1) throw new CustomError("Notification not found", 404);

    // Fetch notification details
    const notification =
      await notificationService.getNotificationByTenantIdAndNotificationId(
        tenant_id,
        notification_id
      );
    res.status(200).json(notification);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing notification
 */
exports.updateNotification = async (req, res, next) => {
  const { notification_id, tenant_id } = req.params;
  const details = req.body;

  try {
    // Validate update input
    await notificationValidation.updateNotificationValidation(
      notification_id,
      details
    );

    // Update the notification
    await notificationService.updateNotification(
      notification_id,
      details,
      tenant_id
    );
    res.status(200).json({ message: "Notification updated successfully" });
  } catch (err) {
    next(err);
  }
};

exports.markNotificationAsRead = async (req, res, next) => {
  const { notification_recipient_id } = req.params;

  try {
    // Validate update input
    await checkIfIdExists(
      "notificationrecipients",
      "notification_recipient_id",
      notification_recipient_id
    );

    // Update the notification
    await notificationRecipientService.markNotificationAsRead(
      notification_recipient_id
    );
    res
      .status(200)
      .json({ message: "NotificationRecipients updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a notification by ID and tenant ID
 */
exports.deleteNotificationByTenantIdAndNotificationId = async (
  req,
  res,
  next
) => {
  const { notification_id, tenant_id } = req.params;

  try {
    // Validate if notification exists
    const treatment = await checkIfExists(
      "notifications",
      "notification_id",
      notification_id,
      tenant_id
    );
    if (!treatment) throw new CustomError("notificationId not Exists", 404);

    // Delete the notification
    await notificationService.deleteNotificationByTenantIdAndNotificationId(
      tenant_id,
      notification_id
    );
    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (err) {
    next(err);
  }
};
