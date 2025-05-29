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
  GET_APPOINTMENT_SUMMARY_PERIOD
} = require("./RouterPath");

// File upload middleware can be added here if needed (e.g. reports, prescriptions)

// Create Appointment
router.post(ADD_APPOINTMENT, appointmentController.createAppointment);

// Get All Appointments by Tenant ID with Pagination
router.get(
  GETALL_APPOINTMENT_TENANT,
  appointmentController.getAllAppointmentsByTenantId
);

// Get Single Appointment by Tenant & Appointment ID
router.get(
  GET_APPOINTMENT_TENANT,
  appointmentController.getAppointmentByTenantIdAndAppointmentId
);

router.get(
  GETALL_PATIENT_VISITEDETAILS,
  appointmentController.getPatientVisitDetailsByPatientIdAndTenantIdAndClinicId
);

// Update Appointment
router.put(UPDATE_APPOINTMENT_TENANT, appointmentController.updateAppointment);

router.put(UPDATE_APPOINTMENT_SCHEDULE_CANCELED, appointmentController.updateAppoinmentStatusCancelled);

// Delete Appointment
router.delete(
  DELETE_APPOINTMENT_TENANT,
  appointmentController.deleteAppointmentByTenantIdAndAppointmentId
);

router.get(
  GETALL_APPOINTMENT_TENANT_CLINIC_DENTIST,
  appointmentController.getAppointmentsWithDetails
);

router.get(
  GET_APPOINTMENT_MONTHLY_SUMMARY,
  appointmentController.getAppointmentMonthlySummary
);

router.get(
  GET_APPOINTMENT_MONTHLY_SUMMARY,
  appointmentController.getAppointmentMonthlySummary
);

module.exports = router;
