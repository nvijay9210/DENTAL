const express = require("express");
const router = express.Router();

const reminderController = require("../controllers/ReminderController");
const {
  ADD_EXPENSE,
  GETALL_EXPENSE_TENANT,
  GET_EXPENSE_TENANT,
  UPDATE_EXPENSE_TENANT,
  DELETE_EXPENSE_TENANT,
} = require("./RouterPath");

// Create Reminder
router.post(
  ADD_EXPENSE,
  reminderController.createReminder
);

// Get All Reminders by Tenant ID with Pagination
router.get(GETALL_EXPENSE_TENANT, reminderController.getAllRemindersByTenantId);

// Get Single Reminder by Tenant ID & Reminder ID
router.get(GET_EXPENSE_TENANT, reminderController.getReminderByTenantIdAndReminderId);

// Update Reminder
router.put(
  UPDATE_EXPENSE_TENANT,
  reminderController.updateReminder
);

// Delete Reminder
router.delete(
  DELETE_EXPENSE_TENANT,
  reminderController.deleteReminderByTenantIdAndReminderId
);

module.exports = router;
