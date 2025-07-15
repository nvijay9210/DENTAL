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

const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

// Create AppointmentReschedules
router.post(
  ADD_APPOINTMENT_RESCHEDULES,
  authenticateTenantClinicGroup(['tenant','receptionist',,'super-user','dentist']),
  appointmentRescheduleController.createAppointmentReschedules
);

// Get All AppointmentRescheduless by Tenant ID with Pagination
router.get(
  GETALL_APPOINTMENT_RESCHEDULES_TENANT,
  authenticateTenantClinicGroup(['tenant','receptionist',,'super-user','dentist']),
  appointmentRescheduleController.getAllAppointmentReschedulessByTenantId
);

router.get(
  GETALL_APPOINTMENT_RESCHEDULES_TENANT_CLINIC,
  authenticateTenantClinicGroup(['tenant','receptionist',,'super-user','dentist']),
  appointmentRescheduleController.getAllAppointmentReschedulessByTenantIdAndClinicId
);

router.get(
  GETALL_APPOINTMENT_RESCHEDULES_TENANT_CLINIC_DENTIST,
  authenticateTenantClinicGroup(['tenant','receptionist',,'super-user','dentist']),
  appointmentRescheduleController.getAllAppointmentReschedulessByTenantIdAndClinicIdAndDentistId
);

// Get Single AppointmentReschedules by Tenant ID & AppointmentReschedules ID
router.get(
  GET_APPOINTMENT_RESCHEDULES_TENANT,
  authenticateTenantClinicGroup(['tenant','receptionist',,'super-user','dentist']),
  appointmentRescheduleController.getAppointmentReschedulesByTenantIdAndAppointmentReschedulesId
);

// Update AppointmentReschedules
router.put(
  UPDATE_APPOINTMENT_RESCHEDULES_TENANT,
  authenticateTenantClinicGroup(['tenant','receptionist',,'super-user','dentist']),
  appointmentRescheduleController.updateAppointmentReschedules
);

// Delete AppointmentReschedules
router.delete(
  DELETE_APPOINTMENT_RESCHEDULES_TENANT,
  authenticateTenantClinicGroup(['tenant','receptionist',,'super-user','dentist']),
  appointmentRescheduleController.deleteAppointmentReschedulesByTenantIdAndAppointmentReschedulesId
);

module.exports = router;
