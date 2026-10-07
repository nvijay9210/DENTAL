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
  GET_TOOTH_DETAILS_CLINIC,
  GET_TOOTH_DETAILS_DENTIST,
} = require("./RouterPath");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");
const {
  getMostVisitedPatientsByDentistPeriods,
  getMostVisitedPatientsByClinicPeriods,
  getNewPatientsByClinicPeriods,
  getNewPatientsTrendsByDentistAndClinic,
  getAgeGenderByDentist,
  getAgeGenderByClinic,
  groupToothProceduresByTimeRangeCumulative,
  groupToothProceduresByTimeRangeCumulativeByDentist,
} = require("../controllers/PatientController");
const {
  getFinanceSummary,
  getFinanceSummarybyDentist,
} = require("../controllers/ClinicController");

router.get(
  GET_APPOINTMENT_SUMMARY_PERIOD,
  authenticateTenantClinicGroup(["tenant", "superuser","dentist"]),
  appointmentController.getAppointmentSummary
);

router.get(
  GET_PATIENT_SUMMARY_DENTIST,
  authenticateTenantClinicGroup(["tenant", "superuser","dentist"]),
  getMostVisitedPatientsByDentistPeriods
);

router.get(
  GET_PATIENT_SUMMARY_CLINIC,
  authenticateTenantClinicGroup(["tenant", "superuser","dentist"]),
  getMostVisitedPatientsByClinicPeriods
);

router.get(
  GET_NEW_PATIENT_SUMMARY_CLINIC,
  authenticateTenantClinicGroup(["tenant", "superuser","dentist"]),
  getNewPatientsByClinicPeriods
);

router.get(
  GET_NEW_PATIENT_SUMMARY_DENTIST,
  authenticateTenantClinicGroup(["tenant", "superuser","dentist"]),
  getNewPatientsTrendsByDentistAndClinic
);

router.get(
  GET_AGE_GENDER_SUMMARY_DENTIST,
  authenticateTenantClinicGroup(["tenant", "superuser","dentist"]),
  getAgeGenderByDentist
);

router.get(
  GET_AGE_GENDER_SUMMARY_CLINIC,
  authenticateTenantClinicGroup(["tenant", "superuser","dentist"]),
  getAgeGenderByClinic
);

router.get(
  GET_CLINIC_FINANACE_SUMMARY_CLINIC,
  authenticateTenantClinicGroup(["tenant", "superuser","dentist"]),
  getFinanceSummary
);

router.get(
  GET_CLINIC_FINANACE_SUMMARY_DENTIST,
  authenticateTenantClinicGroup(["tenant", "superuser","dentist"]),
  getFinanceSummarybyDentist
);

router.get(
  GET_APPOINTMENT_SUMMARY_CHART_CLINIC,
  authenticateTenantClinicGroup(["tenant", "superuser","dentist"]),
  appointmentController.getAppointmentSummaryChartByClinic
);

router.get(
  GET_APPOINTMENT_SUMMARY_CHART_DENTIST,
  authenticateTenantClinicGroup(["tenant", "superuser","dentist"]),
  appointmentController.getAppointmentSummaryChartByDentist
);

router.get(
  GET_TOOTH_DETAILS_CLINIC,
  authenticateTenantClinicGroup(["tenant", "superuser","dentist"]),
  groupToothProceduresByTimeRangeCumulative
);

router.get(
  GET_TOOTH_DETAILS_DENTIST,
  authenticateTenantClinicGroup(["tenant", "superuser","dentist"]),
  groupToothProceduresByTimeRangeCumulativeByDentist
);

module.exports = router;
