const express = require("express");
const router = express.Router();

const statusTypeController = require("../controllers/StatusTypeController");

const {
  ADD_STATUS_TYPE,
  UPDATE_STATUS_TYPE_TENANT,
  DELETE_STATUS_TYPE_TENANT,
  GETALL_STATUS_TYPE,
  GET_STATUS_TYPE
} = require("./RouterPath");


// Create StatusType
router.post(
  ADD_STATUS_TYPE,
  statusTypeController.createStatusType
);

// Get All StatusTypes by Tenant ID with Pagination
router.get(
  GETALL_STATUS_TYPE,
  statusTypeController.getAllStatusTypesByTenantId
);

// Get Single StatusType by Tenant ID & StatusType ID
router.get(
  GET_STATUS_TYPE,
  statusTypeController.getStatusTypeByStatusTypeId
);

// Update StatusType
router.put(
  UPDATE_STATUS_TYPE_TENANT,
  statusTypeController.updateStatusType
);

// Delete StatusType
router.delete(
  DELETE_STATUS_TYPE_TENANT,
  statusTypeController.deleteStatusTypeByTenantIdAndStatusTypeId
);

module.exports = router;
