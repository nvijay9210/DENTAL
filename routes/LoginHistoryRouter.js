const express = require("express");
const router = express.Router();

const loginhistoryController = require("../controllers/LoginHistoryController");
const {
 
  ADD_LOGIN_HISTORY_LOGIN,
  ADD_LOGIN_HISTORY_LOGOUT
} = require("./RouterPath");

// Create LoginHistory
router.post(
  ADD_LOGIN_HISTORY_LOGIN,
  loginhistoryController.createLoginHistory
);
router.post(
  ADD_LOGIN_HISTORY_LOGOUT,
  loginhistoryController.updateLoginHistory
);

module.exports = router;
