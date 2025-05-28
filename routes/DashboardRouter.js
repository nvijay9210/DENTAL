const express = require("express");
const router = express.Router();

const appointmentController = require("../controllers/AppointmentController");
const {
  GET_APPOINTMENT_SUMMARY_PERIOD,
  GET_APPOINTMENT_SUMMARY_PERIOD_DENTIST,
  GET_APPOINTMENT_SUMMARY_PERIOD_PATIENT,
  GET_PATIENT_SUMMARY_DENTIST,
  GET_PATIENT_SUMMARY_CLINIC,
  GET_NEW_PATIENT_SUMMARY_CLINIC,
  GET_NEW_PATIENT_SUMMARY_DENTIST,
  GET_AGE_GENDER_SUMMARY_DENTIST,
  GET_AGE_GENDER_SUMMARY_CLINIC
} = require("./RouterPath");
const { getPeriodSummaryByPatient, getMostVisitedPatientsByDentistPeriods, getMostVisitedPatientsByClinicPeriods, getNewPatientsByClinicPeriods, getNewPatientsTrendsByDentistAndClinic, getAgeGenderChartData, getAgeGenderByDentist, getAgeGenderByClinic } = require("../controllers/PatientController");

router.get(
    GET_APPOINTMENT_SUMMARY_PERIOD,
    appointmentController.getAppointmentSummary
  );

router.get(
    GET_PATIENT_SUMMARY_DENTIST,
    getMostVisitedPatientsByDentistPeriods
  );

router.get(
  GET_PATIENT_SUMMARY_CLINIC,
  getMostVisitedPatientsByClinicPeriods
  );

router.get(
  GET_NEW_PATIENT_SUMMARY_CLINIC,
  getNewPatientsByClinicPeriods
  );

router.get(
  GET_NEW_PATIENT_SUMMARY_DENTIST,
  getNewPatientsTrendsByDentistAndClinic
  );

router.get(
  GET_AGE_GENDER_SUMMARY_DENTIST,
  getAgeGenderByDentist
  );

router.get(
  GET_AGE_GENDER_SUMMARY_CLINIC,
  getAgeGenderByClinic
  );

module.exports = router;
