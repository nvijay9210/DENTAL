const express = require("express");
const router = express.Router();

const useractivityController = require("../controllers/UserActivtyController");
const {
  ADD_USER_ACTIVITY_LOGIN,
  ADD_USER_ACTIVITY_LOGOUT,
  GETALL_USER_ACTIVITY
} = require("./RouterPath");

// Create UserActivity
router.post(
  ADD_USER_ACTIVITY_LOGIN,
  useractivityController.createUserActivity
);
router.get(
  GETALL_USER_ACTIVITY,
  useractivityController.getAllUserActivitysByTenantId
);
router.put(
  ADD_USER_ACTIVITY_LOGOUT,
  useractivityController.updateUserActivity
);

module.exports = router;
