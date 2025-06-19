const express = require("express");
const router = express.Router();

const useractivityController = require("../controllers/UserActivtyController");
const {
  ADD_USER_ACTIVITY
} = require("./RouterPath");

// Create UserActivity
router.post(
  ADD_USER_ACTIVITY,
  useractivityController.createUserActivity
);

module.exports = router;
