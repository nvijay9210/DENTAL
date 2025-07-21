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
  GETALL_REMINDER_NOTIFY_DENTIST,
  GETALL_REMINDER_TENANT_CLINIC,
  GETALL_REMINDER_TENANT_CLINIC_DENTIST,
  GETALL_REMINDER_NOTIFY_CLINIC,
  GETALL_NOTIFY_CLINIC,
} = require("./RouterPath");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

// Create Reminder
router.post(
  ADD_REMINDER,
  authenticateTenantClinicGroup(["tenant", "dentist", "patient","receptionist"]),
  reminderController.createReminder
);

// Get All Reminders by Tenant ID with Pagination
router.get(
  GETALL_REMINDER_TENANT,
  authenticateTenantClinicGroup(["tenant", "dentist", "patient","receptionist"]),
  reminderController.getAllRemindersByTenantId
);

// Get Single Reminder by Tenant ID & Reminder ID
router.get(
  GET_REMINDER_TENANT,
  authenticateTenantClinicGroup(["tenant", "dentist", "patient","receptionist"]),
  reminderController.getReminderByTenantIdAndReminderId
);

// Get Single Reminder by Tenant ID & Reminder ID
router.get(
  GET_REMINDER_SCHEDULE,
  authenticateTenantClinicGroup(["tenant", "dentist", "patient","receptionist"]),
  reminderController.getReminderByTenantAndClinicIdAndDentistIdAndReminderId
);

router.get(
  GET_REMINDER_SCHEDULE_MONTHLY,
  authenticateTenantClinicGroup(["tenant", "dentist", "patient","receptionist"]),
  reminderController.getMonthlywiseRemindersByTenantAndClinicIdAndDentistId
);

router.get(
  GET_REMINDER_DENTIST_TYPE,
  authenticateTenantClinicGroup(["tenant", "dentist", "patient","receptionist"]),
  reminderController.getAllRemindersByTenantAndClinicAndDentistAndType
);

router.get(
  GETALL_REMINDER_TENANT_CLINIC,
  authenticateTenantClinicGroup(["tenant", "dentist", "patient","receptionist","receptionist"]),
  reminderController.getAllRemindersByTenantAndClinicId
);

router.get(
  GETALL_REMINDER_TENANT_CLINIC_DENTIST,
  authenticateTenantClinicGroup(["tenant", "dentist", "patient","receptionist","receptionist"]),
  reminderController.getAllRemindersByTenantAndClinicAndDentistId
);

router.get(
  GETALL_NOTIFY_DENTIST,
  authenticateTenantClinicGroup(["super-user", "dentist", "patient","receptionist"]),
  reminderController.getAllNotifyByDentist
);
router.get(
  GETALL_NOTIFY_CLINIC,
  authenticateTenantClinicGroup(["super-user", "dentist", "patient","receptionist"]),
  reminderController.getAllNotifyByClinic
);
router.get(
  GETALL_NOTIFY_PATIENT,
  authenticateTenantClinicGroup(["tenant","super-user", "dentist", "patient","receptionist"]),
  reminderController.getAllNotifyByPatient
);
router.get(
  GETALL_REMINDER_NOTIFY_DENTIST,
  authenticateTenantClinicGroup(["tenant","super-user", "dentist", "patient","receptionist"]),
  reminderController.getAllReminderNotifyByDentist
);
router.get(
  GETALL_REMINDER_NOTIFY_CLINIC,
  authenticateTenantClinicGroup(["tenant","super-user", "dentist", "patient","receptionist"]),
  reminderController.getAllReminderNotifyByClinic
);

// Update Reminder
router.put(
  UPDATE_REMINDER_TENANT,
  authenticateTenantClinicGroup(["tenant", "dentist", "patient","receptionist"]),
  reminderController.updateReminder
);

// Delete Reminder
router.delete(
  DELETE_REMINDER_TENANT,
  authenticateTenantClinicGroup(["tenant", "dentist", "patient","receptionist"]),
  reminderController.deleteReminderByTenantIdAndReminderId
);

module.exports = router;
