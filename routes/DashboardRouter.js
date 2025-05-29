const express = require("express");
const router = express.Router();

const appointmentController = require("../controllers/AppointmentController");
const {
  GET_APPOINTMENT_SUMMARY_PERIOD,
  GET_PATIENT_SUMMARY_DENTIST,
  GET_PATIENT_SUMMARY_CLINIC,
  GET_NEW_PATIENT_SUMMARY_CLINIC,
  GET_NEW_PATIENT_SUMMARY_DENTIST,
  GET_AGE_GENDER_SUMMARY_DENTIST,
  GET_AGE_GENDER_SUMMARY_CLINIC,
  GET_CLINIC_FINANACE_SUMMARY_CLINIC,
  GET_APPOINTMENT_SUMMARY_CHART_CLINIC,
  GET_CLINIC_FINANACE_SUMMARY_DENTIST,
  GET_APPOINTMENT_SUMMARY_CHART_DENTIST,
} = require("./RouterPath");
const {
  getPeriodSummaryByPatient,
  getMostVisitedPatientsByDentistPeriods,
  getMostVisitedPatientsByClinicPeriods,
  getNewPatientsByClinicPeriods,
  getNewPatientsTrendsByDentistAndClinic,
  getAgeGenderChartData,
  getAgeGenderByDentist,
  getAgeGenderByClinic,
} = require("../controllers/PatientController");
const {
  getFinanceSummary,
  getFinanceSummarybyDentist,
} = require("../controllers/ClinicController");

router.get(
  GET_APPOINTMENT_SUMMARY_PERIOD,
  appointmentController.getAppointmentSummary
);

router.get(GET_PATIENT_SUMMARY_DENTIST, getMostVisitedPatientsByDentistPeriods);

router.get(GET_PATIENT_SUMMARY_CLINIC, getMostVisitedPatientsByClinicPeriods);

router.get(GET_NEW_PATIENT_SUMMARY_CLINIC, getNewPatientsByClinicPeriods);

router.get(
  GET_NEW_PATIENT_SUMMARY_DENTIST,
  getNewPatientsTrendsByDentistAndClinic
);

router.get(GET_AGE_GENDER_SUMMARY_DENTIST, getAgeGenderByDentist);

router.get(GET_AGE_GENDER_SUMMARY_CLINIC, getAgeGenderByClinic);

router.get(GET_CLINIC_FINANACE_SUMMARY_CLINIC, getFinanceSummary);

router.get(GET_CLINIC_FINANACE_SUMMARY_DENTIST, getFinanceSummarybyDentist);

router.get(
  GET_APPOINTMENT_SUMMARY_CHART_CLINIC,
  appointmentController.getAppointmentSummaryChartByClinic
);

router.get(
  GET_APPOINTMENT_SUMMARY_CHART_DENTIST,
  appointmentController.getAppointmentSummaryChartByDentist
);

module.exports = router;
