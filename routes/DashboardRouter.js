const express = require("express");
const router = express.Router();

const appointmentController = require("../controllers/AppointmentController");
const {
  GET_APPOINTMENT_SUMMARY_PERIOD
} = require("./RouterPath");

router.get(
    GET_APPOINTMENT_SUMMARY_PERIOD,
    appointmentController.getAppointmentSummary
  );

module.exports = router;
