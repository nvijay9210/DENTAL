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
    "dentist","redceptionist"
  ]),
  appointmentController.createAppointment
);

// Get All Appointments by Tenant ID with Pagination
router.get(
  GETALL_APPOINTMENT_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "dentist","redceptionist"
  ]),
  appointmentController.getAllAppointmentsByTenantId
);
router.get(
  GETALL_APPOINTMENT_TENANT_CLINIC,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "dentist","redceptionist"
  ]),
  appointmentController.getAllAppointmentsByTenantIdAndClinicId
);
router.get(
  GETALL_APPOINTMENTS_TENANT_CLINIC_DENTIST,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "patient",
    "dentist","redceptionist"
    "receptionist"
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
    "dentist","redceptionist"
  ]),
  appointmentController.getAppointmentByTenantIdAndAppointmentId
);

router.get(
  GETALL_PATIENT_VISITEDETAILS,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "receptionist",
    "dentist","redceptionist"
    "patient"
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
    "dentist","redceptionist"
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
    "dentist","redceptionist"
  ]),
  appointmentController.updateAppoinmentStatus
);

router.put(
  UPDATE_APPOINTMENT_RATING_FEEDBACK,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "patient",
    "dentist","redceptionist"
  ]),
  appointmentController.updateAppoinmentFeedback
);

router.put(
  UPDATE_APPOINTMENT_FEEDBACK_DISPLAY,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "patient",
    "dentist","redceptionist"
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
    "dentist","redceptionist"
  ]),
  appointmentController.deleteAppointmentByTenantIdAndAppointmentId
);

router.get(
  GETALL_APPOINTMENT_TENANT_CLINIC_DENTIST,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "dentist"
  ]),
  appointmentController.getAppointmentsWithDetails
);
router.get(
  GETALL_APPOINTMENT_TENANT_DENTIST,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "dentist","redceptionist"
  ]),
  appointmentController.getAllAppointmentsByTenantIdAndDentistId
);
router.get(
  GETALL_APPOINTMENT_TENANT_PATIENTID,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "dentist","redceptionist"
  ]),
  appointmentController.getAllAppointmentsByTenantIdAndPatientId
);

router.get(
  GETALL_APPOINTMENT_TENANT_PATIENT,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "dentist","redceptionist"
    "patient"
  ]),
  appointmentController.getAppointmentsWithDetailsByPatient
);
router.get(
  GETALL_APPOINTMENT_ROOMID_DENTIST,
  authenticateTenantClinicGroup([
    "tenant",
    "patient",
    "dentist","redceptionist"
  ]),
  appointmentController.getAllRoomIdByTenantIdAndClinicIdAndDentistId
);
router.get(
  GETALL_APPOINTMENT_ROOMID_PATIENT,
  authenticateTenantClinicGroup([
    "tenant",
    "patient",
    "dentist","redceptionist"
  ]),
  appointmentController.getAllRoomIdByTenantIdAndPatientId
);
router.get(
  GET_ROOMID_APPOINTMENTID,
  authenticateTenantClinicGroup([
    "tenant",
    "patient",
    "dentist","redceptionist"
  ]),
  appointmentController.getRoomIdByTenantIdAndAppointmentId
);

router.get(
  GET_APPOINTMENT_MONTHLY_SUMMARY,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "receptionist",
    "patient",
    "dentist","redceptionist"
  ]),
  appointmentController.getAppointmentMonthlySummary
);

router.get(
  GET_APPOINTMENT_MONTHLY_SUMMARY,
  authenticateTenantClinicGroup([
    "tenant",
    "super-user",
    "receptionist",
    "dentist","redceptionist"
  ]),
  appointmentController.getAppointmentMonthlySummary
);

module.exports = router;
