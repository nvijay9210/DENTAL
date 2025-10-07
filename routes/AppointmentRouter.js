const express = require("express");
const router = express.Router();

const appointmentController = require("../controllers/AppointmentController");
const appointmentValidation = require("../validations/AppointmentValidation");
const {
  ADD_APPOINTMENT,
  GETALL_APPOINTMENT_TENANT,
  GET_APPOINTMENT_TENANT,
  UPDATE_APPOINTMENT_TENANT,
  DELETE_APPOINTMENT_TENANT,
  GETALL_APPOINTMENT_TENANT_CLINIC_DENTIST,
  GET_APPOINTMENT_MONTHLY_SUMMARY,
  GETALL_PATIENT_VISITEDETAILS,
  UPDATE_APPOINTMENT_SCHEDULE_CANCELED,
  GETALL_APPOINTMENT_TENANT_CLINIC,
  GETALL_APPOINTMENTS_TENANT_CLINIC_DENTIST,
  GETALL_APPOINTMENT_TENANT_PATIENT,
  GETALL_APPOINTMENT_TENANT_DENTIST,
  GETALL_APPOINTMENT_TENANT_PATIENTID,
  GETALL_APPOINTMENT_ROOMID_PATIENT,
  GETALL_APPOINTMENT_ROOMID_DENTIST,
  UPDATE_APPOINTMENT_STATUS,
  UPDATE_APPOINTMENT_RATING_FEEDBACK,
  GET_ROOMID_APPOINTMENTID,
  UPDATE_APPOINTMENT_FEEDBACK_DISPLAY,
  GET_APPOINTMENT_MONTHLY_SUMMARY_CLINIC,
  GETALL_APPOINTMENT_WITHDETAILS_TENANT_CLINIC,
} = require("./RouterPath");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

// File upload middleware can be added here if needed (e.g. reports, prescriptions)

// Create Appointment
router.post(
  ADD_APPOINTMENT,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "patient",
    "dentist",
    "superuser",
  ]),
  appointmentController.createAppointment
);

// Get All Appointments by Tenant ID with Pagination
router.get(
  GETALL_APPOINTMENT_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "dentist",
    "superuser",
  ]),
  appointmentController.getAllAppointmentsByTenantId
);
router.get(
  GETALL_APPOINTMENT_TENANT_CLINIC,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "dentist",
    "superuser",
  ]),
  appointmentController.getAllAppointmentsByTenantIdAndClinicId
);
router.get(
  GETALL_APPOINTMENTS_TENANT_CLINIC_DENTIST,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "patient",
    "dentist",
    "superuser",
    "receptionist",
  ]),
  appointmentController.getAllAppointmentsByTenantIdAndClinicIdByDentist
);

// Get Single Appointment by Tenant & Appointment ID
router.get(
  GET_APPOINTMENT_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "patient",
    "dentist",
    "superuser",
  ]),
  appointmentController.getAppointmentByTenantIdAndAppointmentId
);

router.get(
  GETALL_PATIENT_VISITEDETAILS,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "dentist",
    "superuser",
    "patient",
  ]),
  appointmentController.getPatientVisitDetailsByPatientIdAndTenantIdAndClinicId
);

// Update Appointment
router.put(
  UPDATE_APPOINTMENT_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "patient",
    "dentist",
    "superuser",
  ]),
  appointmentController.updateAppointment
);

// router.put(
//   UPDATE_APPOINTMENT_SCHEDULE_CANCELED,
//   appointmentController.updateAppoinmentStatusCancelled
// );

router.put(
  UPDATE_APPOINTMENT_STATUS,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "patient",
    "dentist",
    "superuser",
  ]),
  appointmentController.updateAppoinmentStatus
);

router.put(
  UPDATE_APPOINTMENT_RATING_FEEDBACK,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "patient",
    "dentist",
    "superuser",
  ]),
  appointmentController.updateAppoinmentFeedback
);

router.put(
  UPDATE_APPOINTMENT_FEEDBACK_DISPLAY,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "patient",
    "dentist",
    "superuser",
  ]),
  appointmentController.updateAppoinmentFeedbackDisplay
);

// Delete Appointment
router.delete(
  DELETE_APPOINTMENT_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "patient",
    "dentist",
    "superuser",
  ]),
  appointmentController.deleteAppointmentByTenantIdAndAppointmentId
);

router.get(
  GETALL_APPOINTMENT_TENANT_CLINIC_DENTIST,
  authenticateTenantClinicGroup(["tenant", "receptionist", "dentist"]),
  appointmentController.getAppointmentsWithDetails
);

router.get(
  GETALL_APPOINTMENT_WITHDETAILS_TENANT_CLINIC,
  authenticateTenantClinicGroup(["tenant", "receptionist", "dentist","superuser"]),
  appointmentController.getAppointmentsWithDetailsByClinic
);
router.get(
  GETALL_APPOINTMENT_TENANT_DENTIST,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "dentist",
    "superuser",
  ]),
  appointmentController.getAllAppointmentsByTenantIdAndDentistId
);
router.get(
  GETALL_APPOINTMENT_TENANT_PATIENTID,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "dentist",
    "superuser",
    "patient"
  ]),
  appointmentController.getAllAppointmentsByTenantIdAndPatientId
);

router.get(
  GETALL_APPOINTMENT_TENANT_PATIENT,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "dentist",
    "superuser",
    "patient",
  ]),
  appointmentController.getAppointmentsWithDetailsByPatient
);
router.get(
  GETALL_APPOINTMENT_ROOMID_DENTIST,
  authenticateTenantClinicGroup(["tenant", "patient", "dentist", "superuser"]),
  appointmentController.getAllRoomIdByTenantIdAndClinicIdAndDentistId
);
router.get(
  GETALL_APPOINTMENT_ROOMID_PATIENT,
  authenticateTenantClinicGroup(["tenant", "patient", "dentist", "superuser"]),
  appointmentController.getAllRoomIdByTenantIdAndPatientId
);
router.get(
  GET_ROOMID_APPOINTMENTID,
  authenticateTenantClinicGroup(["tenant", "patient", "dentist", "superuser"]),
  appointmentController.getRoomIdByTenantIdAndAppointmentId
);

router.get(
  GET_APPOINTMENT_MONTHLY_SUMMARY,
  authenticateTenantClinicGroup(["dentist"]),
  appointmentController.getAppointmentMonthlySummary
);

router.get(
  GET_APPOINTMENT_MONTHLY_SUMMARY_CLINIC,
  authenticateTenantClinicGroup(["superuser", "receptionist"]),
  appointmentController.getAppointmentMonthlySummaryClinic
);

// router.get(
//   GET_APPOINTMENT_MONTHLY_SUMMARY,
//   authenticateTenantClinicGroup([
//     "tenant",
//     "receptionist",
//     "dentist",
//     "superuser",
//   ]),
//   appointmentController.getAppointmentMonthlySummary
// );

module.exports = router;
