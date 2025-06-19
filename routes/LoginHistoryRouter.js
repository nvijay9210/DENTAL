const express = require("express");
const router = express.Router();

const loginhistoryController = require("../controllers/LoginHistoryController");
const {
  ADD_LOGIN_HISTORY
} = require("./RouterPath");

// Create LoginHistory
router.post(
  ADD_LOGIN_HISTORY,
  loginhistoryController.createLoginHistory
);

module.exports = router;
