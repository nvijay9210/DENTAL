const express = require("express");
const router = express.Router();

const StatusTypeSubController = require("../controllers/StatusTypeSubController");

const {
  ADD_STATUS_TYPE_SUB,
  GETALL_STATUS_TYPE_SUB_TENANT,
  GET_STATUS_TYPE_SUB_TENANT,
  UPDATE_STATUS_TYPE_SUB_TENANT,
  DELETE_STATUS_TYPE_SUB_TENANT,
  GET_STATUS_TYPE_SUB_STATUS_TYPE,
  UPDATE_STATUS_TYPE_SUB,
  GET_STATUS_TYPE_SUB_STATUS_TYPE_ID
} = require("./RouterPath");


// Create StatusTypeSub
router.post(
  ADD_STATUS_TYPE_SUB,
  StatusTypeSubController.createStatusTypeSub
);

// Get All StatusTypeSubs by Tenant ID with Pagination
router.get(
  GETALL_STATUS_TYPE_SUB_TENANT,
  StatusTypeSubController.getAllStatusTypeSubsByTenantId
);

// Get Single StatusTypeSub by Tenant ID & StatusTypeSub ID
router.get(
  GET_STATUS_TYPE_SUB_TENANT,
  StatusTypeSubController.getStatusTypeSubByTenantIdAndStatusTypeSubId
);

router.get(
  GET_STATUS_TYPE_SUB_STATUS_TYPE_ID,
  StatusTypeSubController.getAllStatusTypeSubByTenantIdAndStatusTypeId
);

router.get(
  GET_STATUS_TYPE_SUB_STATUS_TYPE,
  StatusTypeSubController.getAllStatusTypeSubByTenantIdAndStatusType
);

// Update StatusTypeSub
router.put(
  UPDATE_STATUS_TYPE_SUB,
  StatusTypeSubController.updateStatusTypeSub
);

// Delete StatusTypeSub
router.delete(
  DELETE_STATUS_TYPE_SUB_TENANT,
  StatusTypeSubController.deleteStatusTypeSubByTenantIdAndStatusTypeSubId
);

module.exports = router;
