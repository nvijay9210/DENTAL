const express = require("express");
const router = express.Router();

const reminderPingController = require("../controllers/ReminderPingController");
const {
  ADD_REMINDERPING,
  GETALL_REMINDERPING_TENANT,
  GET_REMINDERPING_TENANT,
  UPDATE_REMINDERPING_TENANT,
  DELETE_REMINDERPING_TENANT,
} = require("./RouterPath");
const reminderPingvalidation = require("../validations/ReminderPingValidation");

// Create ReminderPing
router.post(
  ADD_REMINDERPING,
  reminderPingController.createReminderPing
);

// Get All ReminderPings by Tenant ID with Pagination
router.get(GETALL_REMINDERPING_TENANT, reminderPingController.getAllReminderPingsByTenantId);

// Get Single ReminderPing by Tenant ID & ReminderPing ID
router.get(GET_REMINDERPING_TENANT, reminderPingController.getReminderPingByTenantIdAndReminderPingId);

router.get(GET_REMINDERPING_TENANT_APPOINTMENT, reminderPingController.getReminderPingByTenantAndAppointmentId);

// Update ReminderPing
router.put(
  UPDATE_REMINDERPING_TENANT,
  reminderPingController.updateReminderPing
);

// Delete ReminderPing
router.delete(
  DELETE_REMINDERPING_TENANT,
  reminderPingController.deleteReminderPingByTenantIdAndReminderPingId
);

module.exports = router;
