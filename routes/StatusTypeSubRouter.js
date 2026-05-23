const express = require("express");
const router = express.Router();

const StatusTypeSubController = require("../controllers/StatusTypeSubController");
const {
  authenticateTenantClinicGroup,
} = require("../Keycloak/AuthenticateTenantAndClient");

const {
  ADD_STATUS_TYPE_SUB,
  GETALL_STATUS_TYPE_SUB_TENANT,
  GET_STATUS_TYPE_SUB_TENANT,
  UPDATE_STATUS_TYPE_SUB_TENANT,
  DELETE_STATUS_TYPE_SUB_TENANT,
  GET_STATUS_TYPE_SUB_STATUS_TYPE,
  UPDATE_STATUS_TYPE_SUB,
  GET_STATUS_TYPE_SUB_STATUS_TYPE_ID,
} = require("./RouterPath");
const { globalCacheMiddleware } = require("../middlewares/GlobalCacheMiddleware");
const globalInvalidationMiddleware = require("../middlewares/GlobalInvalidationMiddleware");

// Create StatusTypeSub
router.post(
  ADD_STATUS_TYPE_SUB,
  authenticateTenantClinicGroup(["tenant", "superuser", "dentist","receptionist", "patient","supplier"]),
  globalInvalidationMiddleware,
  StatusTypeSubController.createStatusTypeSub
);

// Get All StatusTypeSubs by Tenant ID with Pagination
router.get(
  GETALL_STATUS_TYPE_SUB_TENANT,
  authenticateTenantClinicGroup(["tenant", "superuser", "dentist","receptionist", "patient","supplier"]),
  globalCacheMiddleware,
  StatusTypeSubController.getAllStatusTypeSubsByTenantId
);

// Get Single StatusTypeSub by Tenant ID & StatusTypeSub ID
router.get(
  GET_STATUS_TYPE_SUB_TENANT,
  authenticateTenantClinicGroup(["tenant", "superuser", "dentist","receptionist", "patient","supplier"]),
  globalCacheMiddleware,
  StatusTypeSubController.getStatusTypeSubByTenantIdAndStatusTypeSubId
);

router.get(
  GET_STATUS_TYPE_SUB_STATUS_TYPE_ID,
  authenticateTenantClinicGroup(["tenant", "superuser", "dentist","receptionist", "patient","supplier","guest"]),
  globalCacheMiddleware,
  StatusTypeSubController.getAllStatusTypeSubByTenantIdAndStatusTypeId
);

router.get(
  GET_STATUS_TYPE_SUB_STATUS_TYPE,
  authenticateTenantClinicGroup(["tenant", "superuser", "dentist","receptionist", "patient","supplier","guest"]),
  globalCacheMiddleware,
  StatusTypeSubController.getAllStatusTypeSubByTenantIdAndStatusType
);

// Update StatusTypeSub
router.put(
  UPDATE_STATUS_TYPE_SUB,
  authenticateTenantClinicGroup(["tenant", "superuser", "dentist","receptionist", "patient","supplier"]),
  globalInvalidationMiddleware,
  StatusTypeSubController.updateStatusTypeSub
);

// Delete StatusTypeSub
router.delete(
  DELETE_STATUS_TYPE_SUB_TENANT,
  authenticateTenantClinicGroup(["tenant", "superuser", "dentist","receptionist", "patient","supplier"]),
  globalInvalidationMiddleware,
  StatusTypeSubController.deleteStatusTypeSubByTenantIdAndStatusTypeSubId
);

module.exports = router;
