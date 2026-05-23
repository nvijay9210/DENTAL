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
const {
  globalCacheMiddleware,
} = require("../middlewares/GlobalCacheMiddleware");
const globalInvalidationMiddleware = require("../middlewares/GlobalInvalidationMiddleware");

// Create AppointmentReschedules
router.post(
  ADD_APPOINTMENT_RESCHEDULES,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    "superuser",
    "dentist",
    "patient",
  ]),
  globalInvalidationMiddleware,
  appointmentRescheduleController.createAppointmentReschedules,
);

// Get All AppointmentRescheduless by Tenant ID with Pagination
router.get(
  GETALL_APPOINTMENT_RESCHEDULES_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    ,
    "superuser",
    "dentist",
  ]),
  globalCacheMiddleware,
  appointmentRescheduleController.getAllAppointmentReschedulessByTenantId,
);

router.get(
  GETALL_APPOINTMENT_RESCHEDULES_TENANT_CLINIC,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    ,
    "superuser",
    "dentist",
  ]),
  globalCacheMiddleware,
  appointmentRescheduleController.getAllAppointmentReschedulessByTenantIdAndClinicId,
);

router.get(
  GETALL_APPOINTMENT_RESCHEDULES_TENANT_CLINIC_DENTIST,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    ,
    "superuser",
    "dentist",
  ]),
  globalCacheMiddleware,
  appointmentRescheduleController.getAllAppointmentReschedulessByTenantIdAndClinicIdAndDentistId,
);

// Get Single AppointmentReschedules by Tenant ID & AppointmentReschedules ID
router.get(
  GET_APPOINTMENT_RESCHEDULES_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    ,
    "superuser",
    "dentist",
  ]),
  globalCacheMiddleware,
  globalInvalidationMiddleware,
  appointmentRescheduleController.getAppointmentReschedulesByTenantIdAndAppointmentReschedulesId,
);

// Update AppointmentReschedules
router.put(
  UPDATE_APPOINTMENT_RESCHEDULES_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    ,
    "superuser",
    "dentist",
  ]),
  globalInvalidationMiddleware,
  appointmentRescheduleController.updateAppointmentReschedules,
);

// Delete AppointmentReschedules
router.delete(
  DELETE_APPOINTMENT_RESCHEDULES_TENANT,
  authenticateTenantClinicGroup([
    "tenant",
    "receptionist",
    ,
    "superuser",
    "dentist",
  ]),
  globalInvalidationMiddleware,
  appointmentRescheduleController.deleteAppointmentReschedulesByTenantIdAndAppointmentReschedulesId,
);

module.exports = router;
