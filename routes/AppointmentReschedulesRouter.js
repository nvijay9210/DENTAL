const express = require("express");
const router = express.Router();

const appointmentRescheduleController = require("../controllers/AppointmentReschedulesController");
const {
  ADD_APPOINTMENT_RESCHEDULES,
  GETALL_APPOINTMENT_RESCHEDULES_TENANT,
  GET_APPOINTMENT_RESCHEDULES_TENANT,
  UPDATE_APPOINTMENT_RESCHEDULES_TENANT,
  DELETE_APPOINTMENT_RESCHEDULES_TENANT,
  GETALL_APPOINTMENT_RESCHEDULES_TENANT_CLINIC,
  GETALL_APPOINTMENT_RESCHEDULES_TENANT_CLINIC_DENTIST,
} = require("./RouterPath");
const appointmentReschedulevalidation = require("../validations/AppointmentReschedulesValidation");

// Create AppointmentReschedules
router.post(
  ADD_APPOINTMENT_RESCHEDULES,
  appointmentRescheduleController.createAppointmentReschedules
);

// Get All AppointmentRescheduless by Tenant ID with Pagination
router.get(GETALL_APPOINTMENT_RESCHEDULES_TENANT, appointmentRescheduleController.getAllAppointmentReschedulessByTenantId);

router.get(GETALL_APPOINTMENT_RESCHEDULES_TENANT_CLINIC, appointmentRescheduleController.getAllAppointmentReschedulessByTenantIdAndClinicId);

router.get(GETALL_APPOINTMENT_RESCHEDULES_TENANT_CLINIC_DENTIST, appointmentRescheduleController.getAllAppointmentReschedulessByTenantIdAndClinicIdAndDentistId);

// Get Single AppointmentReschedules by Tenant ID & AppointmentReschedules ID
router.get(GET_APPOINTMENT_RESCHEDULES_TENANT, appointmentRescheduleController.getAppointmentReschedulesByTenantIdAndAppointmentReschedulesId);

// Update AppointmentReschedules
router.put(
  UPDATE_APPOINTMENT_RESCHEDULES_TENANT,
  appointmentRescheduleController.updateAppointmentReschedules
);

// Delete AppointmentReschedules
router.delete(
  DELETE_APPOINTMENT_RESCHEDULES_TENANT,
  appointmentRescheduleController.deleteAppointmentReschedulesByTenantIdAndAppointmentReschedulesId
);

module.exports = router;
