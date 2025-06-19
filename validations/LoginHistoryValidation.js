const { CustomError } = require("../middlewares/CustomeError");
const { validateInput } = require("./InputValidation");
const { checkIfIdExists } = require("../models/checkIfExists");
const { isEarlier } = require("../utils/DateUtils");

const loginhistoryColumnConfig = [
  { columnname: "tenant_id", type: "int", size: 11, null: false },
  { columnname: "clinic_id", type: "int", size: 11, null: false },
  { columnname: "keycloak_user_id", type: "varchar", size: 36, null: false },
  { columnname: "session_id", type: "varchar", size: 50, null: false },
  { columnname: "ip_address", type: "varchar", size: 45, null: true },
  { columnname: "browser_info", type: "text", null: true },
  {
    columnname: "device_info",
    type: "text",
    null: true,
  },
  { columnname: "login_time", type: "datetime", null: false },
  { columnname: "logout_time", type: "datetime", size: 50, null: true }
];
/**
 * Validate Create LoginHistory Input with Tenant Scope
 */
const createLoginHistoryValidation = async (details) => {
  validateInput(details, loginhistoryColumnConfig);
};

/**
 * Validate Update LoginHistory Input with Tenant Scope
 */
const updateLoginHistoryValidation = async (loginhistory_id, details) => {
  validateInput(details, loginhistoryColumnConfig);

  if (details.logout_time === null)
    throw new CustomError("logout_time is required");

  const earlier = isEarlier(details.login_time, details.logout_time);
  if (!earlier) throw new CustomError("logout_time is smaller than login_time");

  const exists = await checkIfIdExists(
    "loginhistory",
    "loginhistory_id",
    loginhistory_id
  );
  if (!exists) {
    throw new CustomError("LoginHistory not found", 404);
  }
};

module.exports = {
  createLoginHistoryValidation,
  updateLoginHistoryValidation,
};
