const express = require("express");
const router = express.Router();

const reminderController = require("../controllers/ReminderController");
const {
  ADD_REMINDER,
  GETALL_REMINDER_TENANT,
  GET_REMINDER_TENANT,
  UPDATE_REMINDER_TENANT,
  DELETE_REMINDER_TENANT,
  GET_REMINDER_SCHEDULE,
  GET_REMINDER_SCHEDULE_MONTHLY,
  GET_REMINDER_DENTIST_TYPE,
  GETALL_NOTIFY_DENTIST,
  GETALL_NOTIFY_PATIENT,
} = require("./RouterPath");

// Create Reminder
router.post(ADD_REMINDER, reminderController.createReminder);

// Get All Reminders by Tenant ID with Pagination
router.get(
  GETALL_REMINDER_TENANT,
  reminderController.getAllRemindersByTenantId
);

// Get Single Reminder by Tenant ID & Reminder ID
router.get(
  GET_REMINDER_TENANT,
  reminderController.getReminderByTenantIdAndReminderId
);

// Get Single Reminder by Tenant ID & Reminder ID
router.get(
  GET_REMINDER_SCHEDULE,
  reminderController.getReminderByTenantAndClinicIdAndDentistIdAndReminderId
);

router.get(
  GET_REMINDER_SCHEDULE_MONTHLY,
  reminderController.getMonthlywiseRemindersByTenantAndClinicIdAndDentistId
);

router.get(
  GET_REMINDER_DENTIST_TYPE,
  reminderController.getAllRemindersByTenantAndClinicAndDentistAndType
);

router.get(
  GETALL_NOTIFY_DENTIST,
  reminderController.getAllNotifyByDentist
);
router.get(
  GETALL_NOTIFY_PATIENT,
  reminderController.getAllNotifyByPatient
);

// Update Reminder
router.put(UPDATE_REMINDER_TENANT, reminderController.updateReminder);

// Delete Reminder
router.delete(
  DELETE_REMINDER_TENANT,
  reminderController.deleteReminderByTenantIdAndReminderId
);

module.exports = router;
