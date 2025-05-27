const express = require("express");
const router = express.Router();

const appointmentController = require("../controllers/AppointmentController");
const {
  GET_APPOINTMENT_SUMMARY_PERIOD,
  GET_APPOINTMENT_SUMMARY_PERIOD_DENTIST,
  GET_APPOINTMENT_SUMMARY_PERIOD_PATIENT
} = require("./RouterPath");
const { getPeriodSummaryByPatient } = require("../controllers/PatientController");

router.get(
    GET_APPOINTMENT_SUMMARY_PERIOD,
    appointmentController.getAppointmentSummary
  );
router.get(
    GET_APPOINTMENT_SUMMARY_PERIOD_DENTIST,
    appointmentController.getAppointmentSummaryByDentist
  );
router.get(
  GET_APPOINTMENT_SUMMARY_PERIOD_PATIENT,
    getPeriodSummaryByPatient
  );

module.exports = router;
