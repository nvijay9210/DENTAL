const express = require("express");
const router = express.Router();

const useractivityController = require("../controllers/UserActivtyController");
const {
  ADD_USER_ACTIVITY_LOGIN,
  ADD_USER_ACTIVITY_LOGOUT
} = require("./RouterPath");

// Create UserActivity
router.post(
  ADD_USER_ACTIVITY_LOGIN,
  useractivityController.sessionActivityLogin
);
router.post(
  ADD_USER_ACTIVITY_LOGOUT,
  useractivityController.sessionActivityLogout
);

module.exports = router;
