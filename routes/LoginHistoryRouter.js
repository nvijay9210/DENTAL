const express = require("express");
const router = express.Router();

const loginhistoryController = require("../controllers/LoginHistoryController");
const {
 
  ADD_LOGIN_HISTORY_LOGIN,
  ADD_LOGIN_HISTORY_LOGOUT,
  GETALL_LOGIN_HISTORY
} = require("./RouterPath");

// Create LoginHistory
router.post(
  ADD_LOGIN_HISTORY_LOGIN,
  loginhistoryController.createLoginHistory
);
router.get(
  GETALL_LOGIN_HISTORY,
  loginhistoryController.getAllLoginHistorysByTenantId
);

router.put(
  ADD_LOGIN_HISTORY_LOGOUT,
  loginhistoryController.updateLoginHistory
);

module.exports = router;
